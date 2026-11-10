import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold', !color && 'bg-ink-700/60 text-slate-300', className)}
      style={color ? { backgroundColor: `${color}1A`, color } : undefined}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = '#FF5A1F',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-[1.25rem] border border-ink-600/70 bg-ink-800 p-5 shadow-card">
      <div className="absolute bottom-0 left-5 right-5 h-0.5 opacity-60" style={{ backgroundColor: tone }} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400">{label}</p>
        {icon && (
          <span className="rounded-lg p-1.5" style={{ backgroundColor: `${tone}1A`, color: tone }}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 break-words text-2xl font-semibold tracking-[-.045em] text-slate-100 sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50',
        checked ? 'bg-emerald-500' : 'bg-ink-600',
      )}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-wider text-brand-500">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-[-.045em] text-slate-100 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-ink-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={cn('max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-ink-800 shadow-pop animate-fade-up sm:rounded-3xl', wide ? 'sm:max-w-4xl' : 'sm:max-w-md')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-ink-700 bg-ink-800 px-5 py-4">
          <h3 className="font-bold text-slate-100">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-700/60" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: Array<{ value: T; label: ReactNode }> }) {
  return (
    <div className="inline-flex rounded-xl bg-ink-700/60 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
            value === option.value ? 'bg-ink-800 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
