import { CreditCard, Star } from 'lucide-react';
import { cn } from '@/lib/cn';

const GRADIENTS: Record<string, string> = {
  Visa: 'from-ink-900 via-ink-800 to-accent-600',
  Mastercard: 'from-ink-900 via-[#3b1d12] to-brand-600',
  'American Express': 'from-ink-900 via-[#0f3b3a] to-teal-600',
};

/** Tarjeta dibujada: se usa en el formulario de pago y en "Mis tarjetas". */
export function CreditCardVisual({
  marca,
  numero,
  titular,
  expiracion,
  alias,
  principal,
  compact,
  className,
}: {
  marca: string;
  numero: string;
  titular: string;
  expiracion: string;
  alias?: string;
  principal?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-pop',
        GRADIENTS[marca] ?? 'from-ink-900 via-ink-800 to-slate-600',
        compact ? 'p-4' : 'p-5',
        className,
      )}
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <CreditCard className={cn('text-brand-400', compact ? 'h-5 w-5' : 'h-7 w-7')} />
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-200">
          {principal && <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />}
          {alias ?? 'Rumbo Pay · simulado'}
        </span>
      </div>
      <p className={cn('relative font-mono tracking-[0.18em]', compact ? 'mt-4 text-sm' : 'mt-6 text-lg')}>{numero}</p>
      <div className="relative mt-3 flex justify-between text-xs text-slate-300">
        <span className="truncate pr-2 uppercase">{titular || 'TITULAR'}</span>
        <span className="shrink-0">
          {expiracion} · {marca}
        </span>
      </div>
    </div>
  );
}
