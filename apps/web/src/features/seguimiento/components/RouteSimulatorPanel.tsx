import { useMemo, useState } from 'react';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import { CheckCircle2, CircleDot, Loader2, MapPin, PackageCheck, Play, Square, Warehouse } from 'lucide-react';
import { BaseMap, boundsOf, pinIcon, vehicleIcon } from '@/components/map/BaseMap';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import { medioColor } from '@/lib/medios';
import type { Envio } from '@/types/api';
import { useRouteSimulation, type ParadaRecorrido } from '../hooks/useRouteSimulation';

interface Props {
  repartidorId: string;
  medioId: string;
  base: { nombre: string; lat: number; lng: number };
  /** Entregas en el orden del algoritmo (para dibujar el plan antes de iniciar). */
  envios: Envio[];
  mapClassName?: string;
}

const ICONO_PARADA = { PENDIENTE: CircleDot, EN_CURSO: Loader2, HECHA: CheckCircle2 };

/**
 * Simulador del recorrido completo: el repartidor sale de su base, recoge y
 * entrega cada envío en el orden del algoritmo genético. Los estados de los
 * pedidos cambian de verdad, así que el cliente recibe sus avisos.
 */
export function RouteSimulatorPanel({ repartidorId, medioId, base, envios, mapClassName = 'h-72 lg:h-[460px]' }: Props) {
  const sim = useRouteSimulation(repartidorId);
  const [velocidad, setVelocidad] = useState<'1' | '2' | '4'>('2');
  const color = medioColor(sim.estado?.medioId ?? medioId);

  // Paradas: las del recorrido en curso, o el plan calculado de las entregas asignadas.
  const paradas: ParadaRecorrido[] = useMemo(
    () =>
      sim.estado?.paradas ??
      envios.flatMap((envio) => [
        { folio: envio.folio, tipo: 'RECOGER' as const, direccion: envio.origenDireccion, lat: envio.origenLat, lng: envio.origenLng, estado: 'PENDIENTE' as const },
        { folio: envio.folio, tipo: 'ENTREGAR' as const, direccion: envio.destinoDireccion, lat: envio.destinoLat, lng: envio.destinoLng, estado: 'PENDIENTE' as const },
      ]),
    [sim.estado, envios],
  );
  const plan: [number, number][] = [[base.lat, base.lng], ...paradas.map((p) => [p.lat, p.lng] as [number, number])];
  const hechas = paradas.filter((p) => p.estado === 'HECHA').length;
  const terminado = sim.estado && sim.estado.estado !== 'EN_CURSO';

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="relative min-w-0">
        <BaseMap className={mapClassName} bounds={boundsOf(plan)}>
          <Polyline positions={plan} pathOptions={{ color: '#507CF5', weight: 2, opacity: 0.35, dashArray: '6 8' }} />
          {sim.tramo.length > 1 && <Polyline positions={sim.tramo} pathOptions={{ color, weight: 3, opacity: 0.45, dashArray: '4 6' }} />}
          {sim.recorrido.length > 1 && <Polyline positions={sim.recorrido} pathOptions={{ color, weight: 5, opacity: 0.95 }} />}
          <Marker position={[base.lat, base.lng]} icon={pinIcon('#64748B', 'B')}>
            <Tooltip>Base: {base.nombre}</Tooltip>
          </Marker>
          {paradas.map((parada, index) => (
            <Marker
              key={`${parada.folio}-${parada.tipo}`}
              position={[parada.lat, parada.lng]}
              icon={pinIcon(parada.estado === 'HECHA' ? '#10B981' : parada.tipo === 'RECOGER' ? '#507CF5' : '#FF5A1F', String(index + 1))}
            >
              <Tooltip>
                {index + 1}. {parada.tipo === 'RECOGER' ? 'Recoger' : 'Entregar'} {parada.folio}
              </Tooltip>
            </Marker>
          ))}
          {sim.posicion && <Marker position={[sim.posicion.lat, sim.posicion.lng]} icon={vehicleIcon(sim.estado?.medioId ?? medioId, color, sim.activo)} zIndexOffset={1000} />}
        </BaseMap>
        {sim.estado && (
          <div className="absolute inset-x-3 bottom-3 z-[500] rounded-2xl bg-ink-900/95 p-3 shadow-pop backdrop-blur">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="min-w-0 truncate font-bold text-slate-100">{sim.estado.mensaje}</p>
              <span className="shrink-0 text-xs font-semibold text-slate-400">{sim.estado.kmRecorridos.toFixed(1)} km</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-700/60">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(hechas / Math.max(1, paradas.length)) * 100}%`, backgroundColor: color }} />
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={velocidad}
            onChange={setVelocidad}
            options={[
              { value: '1', label: '1×' },
              { value: '2', label: '2×' },
              { value: '4', label: '4×' },
            ]}
          />
          {sim.activo ? (
            <Button variant="danger" size="sm" loading={sim.detener.isPending} onClick={() => sim.detener.mutate()}>
              <Square className="h-3.5 w-3.5" /> Detener
            </Button>
          ) : (
            <Button size="sm" loading={sim.iniciar.isPending} disabled={envios.length === 0} onClick={() => sim.iniciar.mutate(Number(velocidad) as 1 | 2 | 4)}>
              <Play className="h-3.5 w-3.5" /> {terminado ? 'Simular de nuevo' : 'Simular recorrido'}
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-400">
          {paradas.length / 2} entregas · {paradas.length} paradas en el orden del algoritmo genético. Los pedidos cambian de estado y el cliente recibe sus avisos.
        </p>
        <ol className="max-h-80 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
          <li className="flex items-center gap-2 rounded-xl bg-ink-900 px-3 py-2 text-xs text-slate-300">
            <Warehouse className="h-4 w-4 shrink-0 text-slate-400" /> Salida: {base.nombre}
          </li>
          {paradas.map((parada, index) => {
            const Icono = ICONO_PARADA[parada.estado];
            return (
              <li
                key={`${parada.folio}-${parada.tipo}`}
                className={cn(
                  'flex items-start gap-2 rounded-xl border px-3 py-2 text-xs transition',
                  parada.estado === 'EN_CURSO' ? 'border-brand-400 bg-brand-500/10' : parada.estado === 'HECHA' ? 'border-emerald-500/25 bg-emerald-50/60' : 'border-ink-700 bg-ink-800',
                )}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-white">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 font-semibold text-slate-100">
                    {parada.tipo === 'RECOGER' ? <PackageCheck className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5 text-brand-500" />}
                    {parada.tipo === 'RECOGER' ? 'Recoger' : 'Entregar'} {parada.folio}
                  </span>
                  <span className="block truncate text-slate-400">{parada.direccion}</span>
                </span>
                <Icono
                  className={cn(
                    'h-4 w-4 shrink-0',
                    parada.estado === 'HECHA' ? 'text-emerald-500' : parada.estado === 'EN_CURSO' ? 'animate-spin text-brand-500' : 'text-slate-300',
                  )}
                />
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
