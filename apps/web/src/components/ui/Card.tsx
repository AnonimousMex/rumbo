import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-0 rounded-[1.25rem] border border-ink-600/70 bg-ink-800 shadow-card', className)} {...props} />;
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-ink-700 px-6 py-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 rounded-xl bg-brand-500/10 p-2 text-brand-400">{icon}</div>}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-100">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />;
}
