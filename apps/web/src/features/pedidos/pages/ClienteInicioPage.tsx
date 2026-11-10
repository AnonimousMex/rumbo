import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, PackagePlus, MapPin } from 'lucide-react';
import { RouteArtwork } from '@/components/brand/RouteArtwork';
import { MedioIcon } from '@/components/map/MedioIcon';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { api } from '@/lib/apiClient';
import { money, relative, time } from '@/lib/format';
import { medioColor, medioNombre } from '@/lib/medios';
import type { BffSection, PedidoApp, Paginated } from '@/types/api';
import { StatusBadge } from '../components/StatusBadge';

interface ClienteInicio {
  usuario: { nombre: string };
  activos: BffSection<Paginated<PedidoApp>>;
  recientes: BffSection<Paginated<PedidoApp>>;
  resumen: BffSection<Record<string, number>>;
}

export function PedidoMiniCard({ pedido }: { pedido: PedidoApp }) {
  return (
    <Link
      to={`/app/pedidos/${pedido.folio}`}
      className="flex min-w-0 items-center gap-3 rounded-2xl border border-ink-600/70 bg-ink-800 p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-500/25"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${medioColor(pedido.medio)}1A` }}>
        <MedioIcon medio={pedido.medio} className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="whitespace-nowrap font-mono text-xs font-bold text-slate-400">{pedido.folio}</p>
          <StatusBadge status={pedido.estado} />
        </div>
        <p className="mt-0.5 truncate text-sm font-semibold text-slate-100">{pedido.destino}</p>
        <p className="text-xs text-slate-400">
          {pedido.eta ? `Llega aprox. ${time(pedido.eta)}` : relative(pedido.creado)} · {medioNombre(pedido.medio)}
        </p>
      </div>
      <span className="shrink-0 text-sm font-bold text-slate-100">{money(pedido.total)}</span>
    </Link>
  );
}

/** Inicio del cliente: UNA petición al BFF en lugar de doce. */
export function ClienteInicioPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bff', 'cliente'],
    queryFn: () => api.get<ClienteInicio>('/bff/app/inicio').then((r) => r.data),
    refetchInterval: 30_000,
  });

  if (error) return <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />;

  const activos = data?.activos.data?.items ?? [];
  const resumen = data?.resumen.data ?? {};
  const entregados = resumen.ENTREGADO ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="overflow-hidden rounded-[1.75rem] border border-ink-600/70 bg-ink-800">
        <div className="relative grid overflow-hidden bg-ink-900 text-white md:grid-cols-[1.2fr_1fr]">
          <div className="relative z-10 p-6 sm:p-9 lg:p-11">
            <p className="mb-7 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-brand-200"><MapPin className="h-3.5 w-3.5" /> Entregas en Morelia</p>
            <p className="text-sm text-slate-400">Hola, {data?.usuario.nombre.split(' ')[0] ?? '…'}</p>
            <h1 className="mt-2 text-4xl font-semibold leading-[1.1] tracking-[-.05em] sm:text-5xl">Tus paquetes.<br /><span className="text-brand-400">Nuestra ruta.</span></h1>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">Paquetes, compras o pedidos. Dinos dónde recogerlos y a dónde llevarlos.</p>
            <Link to="/app/nuevo" className="mt-7 inline-flex items-center gap-3 rounded-xl bg-brand-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600">
              <PackagePlus className="h-5 w-5" /> Crear un envío <ArrowRight className="ml-3 h-4 w-4" />
            </Link>
          </div>
          <RouteArtwork className="pointer-events-none absolute -right-28 bottom-0 w-80 text-white opacity-20 md:relative md:right-auto md:bottom-auto md:my-auto md:w-full md:opacity-100" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-ink-700 py-5 sm:py-6">
          {[
            ['En camino', activos.length],
            ['Entregados', entregados],
            ['Por pagar', resumen.PENDIENTE_PAGO ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="px-3 text-center sm:px-6 sm:text-left">
              <p className="text-2xl font-semibold tracking-tight text-slate-100">{isLoading ? '—' : value}</p>
              <p className="mt-1 text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-100">En curso</h2>
          <Link to="/app/pedidos" className="flex items-center gap-1 text-xs font-semibold text-brand-400">
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : !data?.activos.ok ? (
          <ErrorState message="El módulo de pedidos no responde en este momento" />
        ) : activos.length === 0 ? (
          <EmptyState title="No tienes envíos en curso" description="Crea uno y síguelo en el mapa en tiempo real." />
        ) : (
          <div className="grid gap-2.5 lg:grid-cols-2">
            {activos.map((pedido) => (
              <PedidoMiniCard key={pedido.folio} pedido={pedido} />
            ))}
          </div>
        )}
      </section>

      {(data?.recientes.data?.items.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 font-bold text-slate-100">Entregados recientemente</h2>
          <div className="grid gap-2.5 lg:grid-cols-2">
            {data!.recientes.data!.items.map((pedido) => (
              <PedidoMiniCard key={pedido.folio} pedido={pedido} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
