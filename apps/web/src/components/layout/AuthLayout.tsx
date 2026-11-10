import type { ReactNode } from 'react';
import { ArrowUpRight, MapPin, Package, PackageCheck } from 'lucide-react';
import { RouteArtwork } from '@/components/brand/RouteArtwork';
import { Logo } from './Logo';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-full bg-surface lg:grid lg:grid-cols-[1.15fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-ink-700 bg-ink-900 p-10 text-white lg:flex lg:flex-col xl:p-14">
        <Logo dark />
        <div className="relative z-10 mt-12 max-w-lg">
          <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-brand-200"><span className="h-px w-8 bg-brand-400" /> Paquetería urbana</p>
          <h2 className="text-5xl font-semibold leading-[1.08] tracking-[-.055em] xl:text-6xl">Tus paquetes,<br />siempre en<br /><span className="text-brand-400">buenas manos.</span></h2>
          <p className="mt-6 max-w-xs text-sm leading-7 text-slate-400">Envía paquetes y pedidos por Morelia. Elige cómo entregarlos y sigue cada recorrido hasta su destino.</p>
        </div>
        <RouteArtwork className="my-6 w-full max-w-lg self-end text-white" />
        <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-400">
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-400" /> Morelia, Michoacán</span>
          <span className="flex items-center gap-2">Vamos contigo <ArrowUpRight className="h-4 w-4" /></span>
        </div>
      </aside>
      <main className="flex items-center justify-center px-6 py-10 sm:px-10 lg:py-14">
        <div className="w-full max-w-[400px] animate-fade-up">
          <div className="mb-12 lg:hidden"><Logo /></div>
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-500/25 bg-brand-500/10 text-brand-400"><Package className="h-6 w-6" /></div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.22em] text-slate-400">Tu próxima entrega empieza aquí</p>
          <h1 className="text-3xl font-semibold tracking-[-.045em] text-slate-100 sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-3 text-sm leading-6 text-slate-400">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          <p className="mt-10 flex items-center justify-center gap-2 border-t border-ink-600/70 pt-6 text-xs text-slate-400"><PackageCheck className="h-4 w-4" /> Cada paquete, en el rumbo correcto.</p>
        </div>
      </main>
    </div>
  );
}
