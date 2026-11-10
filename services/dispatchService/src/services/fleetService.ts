import { NotFoundError, ValidationError } from '@rumbo/shared';
import { prisma } from '../lib/infrastructure.js';

const include = { medio: { select: { id: true, nombre: true, color: true, icono: true, capacidadPaquetes: true } } };

export const fleetService = {
  async list() {
    const [repartidores, carga] = await Promise.all([
      prisma.repartidor.findMany({ include, orderBy: [{ disponible: 'desc' }, { nombre: 'asc' }] }),
      prisma.envio.groupBy({ by: ['repartidorId'], where: { status: { in: ['ASIGNADO', 'EN_RUTA'] } }, _count: true }),
    ]);
    const cargaPor = new Map(carga.map((row) => [row.repartidorId, row._count]));
    return repartidores.map((repartidor) => ({ ...repartidor, cargaActual: cargaPor.get(repartidor.id) ?? 0 }));
  },

  async get(id: string) {
    const repartidor = await prisma.repartidor.findUnique({ where: { id }, include });
    if (!repartidor) throw new NotFoundError('No tienes un perfil de repartidor');
    return repartidor;
  },

  async update(
    id: string,
    data: { medioId?: string; activo?: boolean; disponible?: boolean; baseNombre?: string; baseLat?: number; baseLng?: number },
  ) {
    await this.get(id);
    if (data.medioId && !(await prisma.medio.findUnique({ where: { id: data.medioId } }))) {
      throw new ValidationError('Medio inexistente');
    }
    return prisma.repartidor.update({ where: { id }, data, include });
  },

  /** Ruta del repartidor: sus envíos activos en el orden que decidió el algoritmo. */
  myRoute: (repartidorId: string) =>
    prisma.envio.findMany({
      where: { repartidorId, status: { in: ['ASIGNADO', 'EN_RUTA'] } },
      orderBy: [{ secuencia: 'asc' }],
    }),

  /** Para el simulador de recorrido: base del repartidor + sus entregas en el orden del algoritmo. */
  async routePlan(repartidorId: string) {
    const repartidor = await this.get(repartidorId);
    const envios = await this.myRoute(repartidorId);
    return {
      repartidor: {
        id: repartidor.id,
        nombre: repartidor.nombre,
        medioId: repartidor.medioId,
        base: { nombre: repartidor.baseNombre, lat: repartidor.baseLat, lng: repartidor.baseLng },
      },
      envios: envios.map((envio) => ({
        orderId: envio.orderId,
        folio: envio.folio,
        secuencia: envio.secuencia,
        origen: { direccion: envio.origenDireccion, lat: envio.origenLat, lng: envio.origenLng },
        destino: { direccion: envio.destinoDireccion, lat: envio.destinoLat, lng: envio.destinoLng },
      })),
    };
  },

  async ensureFromUser(user: { userId: string; nombre: string; email: string }) {
    await prisma.repartidor.upsert({
      where: { id: user.userId },
      update: {},
      create: {
        id: user.userId,
        nombre: user.nombre,
        email: user.email,
        medioId: 'motocicleta',
        baseNombre: 'Centro de distribución Rumbo',
        baseLat: 19.7008,
        baseLng: -101.1844,
        disponible: false,
      },
    });
  },
};
