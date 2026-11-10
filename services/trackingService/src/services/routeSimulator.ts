import { randomUUID } from 'node:crypto';
import {
  ConflictError,
  EventTypes,
  ForbiddenError,
  ValidationError,
  type AuthContext,
  type OrderStatus,
  type PedidoSnapshot,
} from '@rumbo/shared';
import { dispatchClient, eventBus, keys, logger, ordersClient, realtime, redis } from '../lib/infrastructure.js';
import { haversine, pointAlong, routeFor } from './trackingService.js';

type Coord = [number, number];

interface PlanRuta {
  repartidor: { id: string; nombre: string; medioId: string; base: { nombre: string; lat: number; lng: number } };
  envios: Array<{
    orderId: string;
    folio: string;
    secuencia: number | null;
    origen: { direccion: string; lat: number; lng: number };
    destino: { direccion: string; lat: number; lng: number };
  }>;
}

export interface ParadaRecorrido {
  folio: string;
  tipo: 'RECOGER' | 'ENTREGAR';
  direccion: string;
  lat: number;
  lng: number;
  estado: 'PENDIENTE' | 'EN_CURSO' | 'HECHA';
}

export interface EstadoRecorrido {
  repartidorId: string;
  repartidorNombre: string;
  medioId: string;
  estado: 'EN_CURSO' | 'COMPLETADO' | 'DETENIDO' | 'FALLIDO';
  velocidad: number;
  base: { nombre: string; lat: number; lng: number };
  paradas: ParadaRecorrido[];
  paradaActual: number;
  kmRecorridos: number;
  mensaje: string;
  inicio: string;
  error?: string;
}

/** Recorridos en curso en ESTE proceso (para poder detenerlos). */
const enCurso = new Map<string, { cancelado: boolean }>();

/** Segundos de animación por km, según el medio (dron rápido, bici lenta). */
const SEG_POR_KM: Record<string, number> = { dron: 1.6, motocicleta: 2.2, camioneta: 2.8, bicicleta: 3.6 };
const TICK_MS = 600;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function guardar(estado: EstadoRecorrido) {
  await redis.set(keys.recorrido(estado.repartidorId), JSON.stringify(estado), 'EX', 60 * 60 * 6);
  await realtime.publish(keys.canalRepartidor(estado.repartidorId), { tipo: 'estado', estado });
}

/** Cambia el estado del pedido COMO si fuera el repartidor (misma validación que la app). */
async function avanzarPedido(folio: string, destino: OrderStatus, actor: AuthContext) {
  await ordersClient.request('PATCH', `/api/pedidos/${folio}/estado`, { body: { estado: destino }, context: actor });
}

/**
 * Simulador del recorrido completo de un repartidor (piloto automático):
 * base → recoger el envío 1 → entregarlo → recoger el 2 → … en el orden que
 * decidió el algoritmo genético. En cada parada cambia el estado real del
 * pedido (recolectado, en camino, entregado), así que cliente y administración
 * reciben sus avisos y correos como en una entrega de verdad.
 */
export const routeSimulator = {
  async start(repartidorId: string, auth: AuthContext, velocidad: number): Promise<EstadoRecorrido> {
    if (auth.role === 'REPARTIDOR' && auth.userId !== repartidorId) throw new ForbiddenError('Solo puedes simular tu propio recorrido');
    if (enCurso.has(repartidorId)) throw new ConflictError('Este repartidor ya está simulando su recorrido', 'RECORRIDO_EN_CURSO');

    const plan = await dispatchClient.get<PlanRuta>(`/internal/repartidores/${repartidorId}/ruta`);
    if (plan.envios.length === 0) throw new ValidationError('El repartidor no tiene entregas asignadas');

    const estado: EstadoRecorrido = {
      repartidorId,
      repartidorNombre: plan.repartidor.nombre,
      medioId: plan.repartidor.medioId,
      estado: 'EN_CURSO',
      velocidad,
      base: plan.repartidor.base,
      paradas: plan.envios.flatMap((envio) => [
        { folio: envio.folio, tipo: 'RECOGER' as const, direccion: envio.origen.direccion, lat: envio.origen.lat, lng: envio.origen.lng, estado: 'PENDIENTE' as const },
        { folio: envio.folio, tipo: 'ENTREGAR' as const, direccion: envio.destino.direccion, lat: envio.destino.lat, lng: envio.destino.lng, estado: 'PENDIENTE' as const },
      ]),
      paradaActual: 0,
      kmRecorridos: 0,
      mensaje: 'Saliendo de la base',
      inicio: new Date().toISOString(),
    };
    const actor: AuthContext = {
      userId: repartidorId,
      role: 'REPARTIDOR',
      email: '',
      name: plan.repartidor.nombre,
      requestId: `recorrido-${randomUUID().slice(0, 8)}`,
      issuedAt: Date.now(),
    };

    const control = { cancelado: false };
    enCurso.set(repartidorId, control);
    await guardar(estado);
    void this.run(plan, estado, actor, control).finally(() => enCurso.delete(repartidorId));
    return estado;
  },

  async run(plan: PlanRuta, estado: EstadoRecorrido, actor: AuthContext, control: { cancelado: boolean }) {
    let posicion: Coord = [plan.repartidor.base.lat, plan.repartidor.base.lng];
    try {
      for (const envio of plan.envios) {
        const snapshot = await ordersClient.get<PedidoSnapshot>(`/internal/pedidos/${envio.folio}`);
        if (!['ASIGNADO', 'RECOLECTADO', 'EN_CAMINO'].includes(snapshot.status)) {
          estado.paradas.filter((p) => p.folio === envio.folio).forEach((p) => (p.estado = 'HECHA'));
          continue;
        }
        await redis.set(keys.autopiloto(envio.folio), '1', 'EX', 60 * 60);

        // Tramo 1: de donde está hasta el punto de recolección.
        const recoger = estado.paradas.findIndex((p) => p.folio === envio.folio && p.tipo === 'RECOGER');
        if (snapshot.status === 'ASIGNADO') {
          estado.paradaActual = recoger;
          estado.paradas[recoger].estado = 'EN_CURSO';
          estado.mensaje = `Va a recoger ${envio.folio}`;
          await guardar(estado);
          posicion = await this.drive(posicion, envio.origen, envio.folio, 'YENDO_A_RECOGER', estado, control);
          if (control.cancelado) return;
          await avanzarPedido(envio.folio, 'RECOLECTADO', actor);
          estado.mensaje = `Recolectó ${envio.folio}`;
          await guardar(estado);
          await sleep(1500 / estado.velocidad);
        } else {
          posicion = [envio.origen.lat, envio.origen.lng];
        }
        estado.paradas[recoger].estado = 'HECHA';

        // Tramo 2: del punto de recolección al destino.
        const entregar = recoger + 1;
        estado.paradaActual = entregar;
        estado.paradas[entregar].estado = 'EN_CURSO';
        estado.mensaje = `Lleva ${envio.folio} a su destino`;
        await guardar(estado);
        if (snapshot.status !== 'EN_CAMINO') await avanzarPedido(envio.folio, 'EN_CAMINO', actor);
        posicion = await this.drive(posicion, envio.destino, envio.folio, 'EN_CAMINO', estado, control);
        if (control.cancelado) return;
        await eventBus.publish(EventTypes.ENVIO_LLEGO_DESTINO, {
          orderId: envio.orderId,
          folio: envio.folio,
          clienteId: snapshot.clienteId,
          repartidorId: estado.repartidorId,
        });
        estado.mensaje = `Llegó al destino de ${envio.folio}`;
        await guardar(estado);
        await sleep(2000 / estado.velocidad);
        await avanzarPedido(envio.folio, 'ENTREGADO', actor);
        estado.paradas[entregar].estado = 'HECHA';
        estado.mensaje = `Entregó ${envio.folio}`;
        await guardar(estado);
        await redis.del(keys.autopiloto(envio.folio));
      }
      estado.estado = 'COMPLETADO';
      estado.paradaActual = estado.paradas.length;
      estado.mensaje = `Recorrido terminado: ${plan.envios.length} entregas, ${estado.kmRecorridos.toFixed(1)} km`;
      await guardar(estado);
    } catch (error) {
      logger.error({ err: error, repartidorId: estado.repartidorId }, 'Falló la simulación del recorrido');
      estado.estado = 'FALLIDO';
      estado.error = (error as Error).message;
      estado.mensaje = 'La simulación se detuvo por un error';
      await guardar(estado);
    }
  },

  /** Mueve el vehículo sobre la ruta (polilínea del mapa) y publica cada posición. */
  async drive(
    desde: Coord,
    hacia: { lat: number; lng: number },
    folio: string,
    status: 'YENDO_A_RECOGER' | 'EN_CAMINO',
    estado: EstadoRecorrido,
    control: { cancelado: boolean },
  ): Promise<Coord> {
    const { polilinea } = await routeFor({
      folio,
      origen: { direccion: '', lat: desde[0], lng: desde[1] },
      destino: { direccion: '', lat: hacia.lat, lng: hacia.lng },
    });
    const km = polilinea.slice(1).reduce((total, punto, i) => total + haversine(polilinea[i], punto), 0);
    const segundos = Math.min(28, Math.max(5, km * (SEG_POR_KM[estado.medioId] ?? 2.5))) / estado.velocidad;
    const ticks = Math.max(4, Math.round((segundos * 1000) / TICK_MS));
    const kmInicio = estado.kmRecorridos;

    for (let i = 1; i <= ticks; i += 1) {
      if (control.cancelado) return desde;
      const progreso = i / ticks;
      const { punto, rumbo } = pointAlong(polilinea, progreso);
      estado.kmRecorridos = kmInicio + km * progreso;
      const posicion = {
        folio,
        lat: Number(punto[0].toFixed(6)),
        lng: Number(punto[1].toFixed(6)),
        progreso: Number(progreso.toFixed(3)),
        etaSeg: Math.round((ticks - i) * (TICK_MS / 1000)),
        rumbo: Math.round(rumbo),
        status,
        medioId: estado.medioId,
        repartidorNombre: estado.repartidorNombre,
        repartidorId: estado.repartidorId,
        tramo: polilinea,
        ts: Date.now(),
      };
      const { tramo: _tramo, ...ligera } = posicion;
      await redis.set(keys.pos(folio), JSON.stringify(ligera), 'EX', 60 * 60 * 24);
      await realtime.publish(keys.canal(folio), ligera);
      await realtime.publish(keys.canalTodos, ligera);
      // Al canal del repartidor se manda también el tramo, para dibujarlo en su mapa.
      await realtime.publish(keys.canalRepartidor(estado.repartidorId), { tipo: 'posicion', posicion: i === 1 ? posicion : ligera, km: estado.kmRecorridos });
      await sleep(TICK_MS);
    }
    return [hacia.lat, hacia.lng];
  },

  async stop(repartidorId: string, auth: AuthContext) {
    if (auth.role === 'REPARTIDOR' && auth.userId !== repartidorId) throw new ForbiddenError();
    const control = enCurso.get(repartidorId);
    if (control) control.cancelado = true;
    const estado = await this.status(repartidorId);
    // Los pedidos pendientes vuelven a la simulación normal de seguimiento.
    for (const parada of estado?.paradas ?? []) await redis.del(keys.autopiloto(parada.folio));
    if (estado && estado.estado === 'EN_CURSO') {
      estado.estado = 'DETENIDO';
      estado.mensaje = 'Simulación detenida; los pedidos conservan su último estado';
      await guardar(estado);
    }
    return estado;
  },

  async status(repartidorId: string): Promise<EstadoRecorrido | null> {
    const raw = await redis.get(keys.recorrido(repartidorId));
    return raw ? (JSON.parse(raw) as EstadoRecorrido) : null;
  },
};
