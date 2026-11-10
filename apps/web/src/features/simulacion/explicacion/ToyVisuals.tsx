import { cn } from '@/lib/cn';
import { ENVIOS, VEHICULOS, type Cromosoma, type Evaluacion, type Gen } from './toyGa';

/** Un gen: arriba el envío, abajo el vehículo (con su color). */
export function GeneBox({
  gen,
  posicion,
  resaltado,
  apagado,
  origen,
  vacio,
  size = 'md',
}: {
  gen?: Gen | null;
  posicion?: number;
  resaltado?: boolean;
  apagado?: boolean;
  origen?: 'A' | 'B';
  vacio?: boolean;
  size?: 'sm' | 'md';
}) {
  const veh = gen ? VEHICULOS[gen.v] : null;
  const sm = size === 'sm';
  return (
    <div className={cn('flex flex-col items-center gap-1 transition-all duration-300', apagado && 'opacity-30')}>
      {posicion !== undefined && <span className="text-[10px] font-semibold text-slate-400">#{posicion + 1}</span>}
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 font-bold transition-all duration-300',
          sm ? 'h-11 w-11 text-[11px]' : 'h-16 w-16 text-sm sm:h-[72px] sm:w-[72px]',
          vacio && 'border-dashed border-ink-600 bg-ink-900 text-slate-300',
          resaltado && 'scale-110 shadow-pop ring-4 ring-amber-300',
        )}
        style={veh && !vacio ? { borderColor: veh.color, backgroundColor: `${veh.color}1F`, color: '#E2E8F0' } : undefined}
      >
        {gen && !vacio ? (
          <>
            <span className={sm ? 'text-xs' : 'text-base'}>{ENVIOS[gen.e].nombre}</span>
            <span className={cn('font-semibold', sm ? 'text-[8px]' : 'text-[10px]')} style={{ color: veh!.color }}>
              {sm ? veh!.nombre.slice(0, 4) : veh!.nombre}
            </span>
          </>
        ) : (
          '?'
        )}
        {origen && (
          <span className={cn('absolute -right-1.5 -top-1.5 rounded-full px-1.5 text-[9px] font-extrabold text-white', origen === 'A' ? 'bg-ink-900' : 'bg-brand-500')}>
            {origen}
          </span>
        )}
      </div>
    </div>
  );
}

export function ChromosomeRow({
  cromosoma,
  resaltados = [],
  numerar = true,
  size,
}: {
  cromosoma: Cromosoma;
  resaltados?: number[];
  numerar?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {cromosoma.map((gen, i) => (
        <GeneBox key={`${gen.e}-${i}`} gen={gen} posicion={numerar ? i : undefined} resaltado={resaltados.includes(i)} size={size} />
      ))}
    </div>
  );
}

/** Leyenda de vehículos con sus restricciones. */
export function VehicleLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {VEHICULOS.map((v) => (
        <span key={v.id} className="flex items-center gap-1.5 rounded-full border border-ink-600/70 bg-ink-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: v.color }} />V{v.id + 1} {v.nombre}
        </span>
      ))}
    </div>
  );
}

/** Mapa de 10 × 10 km del ejemplo, en SVG; con `evaluacion` dibuja las rutas. */
export function ToyMap({ evaluacion, resaltarEnvio, className }: { evaluacion?: Evaluacion | null; resaltarEnvio?: number | null; className?: string }) {
  return (
    <svg viewBox="-4 -4 108 108" className={cn('w-full rounded-2xl border border-ink-600/70 bg-ink-900', className)} role="img" aria-label="Mapa del ejemplo">
      <defs>
        <marker id="toy-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#94a3b8" />
        </marker>
      </defs>
      {Array.from({ length: 11 }, (_, i) => (
        <g key={i} stroke="#e2e8f0" strokeWidth="0.3">
          <line x1={i * 10} y1="0" x2={i * 10} y2="100" />
          <line x1="0" y1={i * 10} x2="100" y2={i * 10} />
        </g>
      ))}
      {ENVIOS.map((envio) => (
        <line
          key={`req-${envio.id}`}
          x1={envio.origen.x}
          y1={envio.origen.y}
          x2={envio.destino.x}
          y2={envio.destino.y}
          stroke="#94a3b8"
          strokeWidth="0.6"
          strokeDasharray="1.5 1.5"
          markerEnd="url(#toy-arrow)"
          opacity={evaluacion ? 0.35 : 1}
        />
      ))}
      {evaluacion?.rutas.map((ruta) =>
        ruta.puntos.length > 1 ? (
          <polyline
            key={ruta.vehiculo}
            points={ruta.puntos.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={VEHICULOS[ruta.vehiculo].color}
            strokeWidth="1.4"
            strokeLinejoin="round"
            opacity="0.9"
          />
        ) : null,
      )}
      {ENVIOS.map((envio) => {
        const activo = resaltarEnvio === undefined || resaltarEnvio === null || resaltarEnvio === envio.id;
        return (
          <g key={envio.id} opacity={activo ? 1 : 0.25}>
            <circle cx={envio.origen.x} cy={envio.origen.y} r="2.4" fill="#111F35" stroke="#93B4FF" strokeWidth="0.8" />
            <circle cx={envio.destino.x} cy={envio.destino.y} r="2.4" fill="#FF5A1F" stroke="white" strokeWidth="0.6" />
            <text x={envio.origen.x + 3} y={envio.origen.y - 2} fontSize="4" fontWeight="700" fill="#93B4FF">
              {envio.nombre}
            </text>
          </g>
        );
      })}
      {VEHICULOS.map((v) => (
        <g key={v.id}>
          <rect x={v.base.x - 3} y={v.base.y - 3} width="6" height="6" rx="1.2" fill={v.color} />
          <text x={v.base.x} y={v.base.y + 1.4} fontSize="3.6" fontWeight="800" fill="#111F35" textAnchor="middle">
            V{v.id + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
