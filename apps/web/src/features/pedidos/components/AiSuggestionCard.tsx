import { useState } from 'react';
import { BrainCircuit, ChevronDown, CircleCheck, CircleSlash, Zap, Ban } from 'lucide-react';
import { MedioIcon } from '@/components/map/MedioIcon';
import { cn } from '@/lib/cn';
import { medioColor, medioNombre } from '@/lib/medios';
import type { SugerenciaIA } from '@/types/api';

const RESULT = {
  ok: { label: 'Respondió', icon: CircleCheck, className: 'text-emerald-300 bg-emerald-500/10' },
  falla: { label: 'Falló', icon: CircleSlash, className: 'text-rose-300 bg-rose-500/10' },
  circuito_abierto: { label: 'Circuito abierto', icon: Zap, className: 'text-amber-300 bg-amber-500/10' },
  no_factible: { label: 'No factible', icon: Ban, className: 'text-slate-300 bg-ink-700/60' },
};

/** Muestra la Sugerencia{ medio, motivo } y, si se quiere, la traza de proveedores. */
export function AiSuggestionCard({ sugerencia, compact }: { sugerencia: SugerenciaIA; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const color = medioColor(sugerencia.medio);
  return (
    <div className="overflow-hidden rounded-2xl border border-accent-500/25 bg-gradient-to-br from-accent-50 to-white">
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink-800 shadow-sm" style={{ color }}>
          <MedioIcon medio={sugerencia.medio} className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-300">
            <BrainCircuit className="h-3.5 w-3.5" /> La IA recomienda
          </p>
          <p className="text-sm text-slate-100">
            <strong style={{ color }}>{medioNombre(sugerencia.medio)}</strong>: {sugerencia.motivo}
          </p>
          <p className="text-[11px] text-slate-400">
            {sugerencia.proveedorNombre} · confianza {Math.round(sugerencia.confianza * 100)}%
            {sugerencia.usoRespaldo && ' · proveedor de respaldo'}
          </p>
        </div>
        {!compact && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-800" aria-label="Ver traza">
            <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {open && (
        <div className="space-y-2 border-t border-accent-500/25 bg-ink-800/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cadena de proveedores</p>
          {sugerencia.intentos.map((intento) => {
            const result = RESULT[intento.resultado];
            return (
              <details key={intento.proveedor} className="rounded-xl border border-ink-600/70 bg-ink-800">
                <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs">
                  <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 font-bold', result.className)}>
                    <result.icon className="h-3 w-3" /> {result.label}
                  </span>
                  <span className="font-semibold text-slate-200">{intento.nombre}</span>
                  <span className="rounded bg-ink-700/60 px-1.5 font-mono text-[10px] text-slate-400">{intento.formato}</span>
                  <span className="ml-auto text-slate-400">{intento.latenciaMs} ms</span>
                </summary>
                <div className="border-t border-ink-700 px-3 py-2">
                  {intento.detalle && <p className="mb-1 text-xs text-slate-400">{intento.detalle}</p>}
                  {intento.respuestaOriginal && (
                    <pre className="max-h-48 overflow-auto rounded-lg bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-emerald-300 scrollbar-thin">
                      {intento.respuestaOriginal}
                    </pre>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
