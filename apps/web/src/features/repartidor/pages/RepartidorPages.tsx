import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, Dna, Star } from 'lucide-react';
import { toast } from 'sonner';
import { MedioIcon } from '@/components/map/MedioIcon';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Toggle } from '@/components/ui/Misc';
import { api, errorMessage } from '@/lib/apiClient';
import { minutes, money } from '@/lib/format';
import type { BffSection, Envio, Paginated, PedidoPanel, Repartidor } from '@/types/api';
import { OrderStatusLabels } from '@rumbo/shared/contracts';
import { StatusBadge } from '@/features/pedidos/components/StatusBadge';
import { RouteSimulatorPanel } from '@/features/seguimiento/components/RouteSimulatorPanel';
import { useCambiarEstado, usePedidosPanel } from '@/features/pedidos/hooks/usePedidos';

interface RepartidorInicio {
  perfil: BffSection<Repartidor>;
  ruta: BffSection<Envio[]>;
  entregas: BffSection<Paginated<PedidoPanel>>;
}

export function RepartidorInicioPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bff', 'repartidor'],
    queryFn: () => api.get<RepartidorInicio>('/bff/repartidor/inicio').then((r) => r.data),
    refetchInterval: 20_000,
  });
  const cambiar = useCambiarEstado();

  const turno = useMutation({
    mutationFn: (disponible: boolean) => api.patch<Repartidor>('/flota/yo', { disponible }).then((r) => r.data),
    // Optimista: el interruptor responde al instante.
    onMutate: async (disponible) => {
      await queryClient.cancelQueries({ queryKey: ['bff', 'repartidor'] });
      const previous = queryClient.getQueryData<RepartidorInicio>(['bff', 'repartidor']);
      if (previous?.perfil.data) {
        queryClient.setQueryData(['bff', 'repartidor'], { ...previous, perfil: { ...previous.perfil, data: { ...previous.perfil.data, disponible } } });
      }
      return { previous };
    },
    onError: (err, _value, context) => {
      queryClient.setQueryData(['bff', 'repartidor'], context?.previous);
      toast.error(errorMessage(err));
    },
    onSuccess: (perfil) => toast.success(perfil.disponible ? 'Estás en turno: recibirás entregas' : 'Saliste de turno'),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />;

  const perfil = data?.perfil.data;
  const ruta = data?.ruta.data ?? [];
  const entregas = new Map((data?.entregas.data?.items ?? []).map((pedido) => [pedido.folio, pedido]));
  const color = perfil?.medio.color ?? '#FF5A1F';
  const puntos: [number, number][] = perfil ? [[perfil.baseLat, perfil.baseLng]] : [];
  ruta.forEach((envio) => puntos.push([envio.origenLat, envio.origenLng], [envio.destinoLat, envio.destinoLng]));

  return (
    <div className="space-y-5 animate-fade-up">
      {perfil && (
        <Card>
          <CardBody className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}1A` }}>
              <MedioIcon medio={perfil.medioId} className="h-7 w-7" />
            </span>
            <div className="flex-1">
              <p className="font-bold text-slate-100">{perfil.nombre}</p>
              <p className="flex items-center gap-2 text-xs text-slate-400">
                {perfil.medio.nombre} · <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {perfil.calificacion} · {perfil.entregasCompletadas} entregas
              </p>
            </div>
            <div className="text-right">
              <Toggle checked={perfil.disponible} onChange={(value) => turno.mutate(value)} label="En turno" />
              <p className="mt-1 text-[11px] font-semibold text-slate-400">{perfil.disponible ? 'En turno' : 'Fuera de turno'}</p>
            </div>
          </CardBody>
        </Card>
      )}

      <div>
        <h1 className="text-xl font-extrabold text-slate-100">Mi ruta de hoy</h1>
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Dna className="h-3.5 w-3.5 text-brand-500" /> Orden calculado por el algoritmo genético
        </p>
      </div>

      <div className="space-y-5">
      {ruta.length > 0 && perfil && (
        <Card>
          <CardBody>
            <RouteSimulatorPanel
              repartidorId={perfil.id}
              medioId={perfil.medioId}
              base={{ nombre: perfil.baseNombre, lat: perfil.baseLat, lng: perfil.baseLng }}
              envios={ruta}
            />
          </CardBody>
        </Card>
      )}

      {ruta.length === 0 ? (
        <div>
        <EmptyState
          title="Sin entregas asignadas"
          description={perfil?.disponible ? 'Cuando el algoritmo te asigne envíos aparecerán aquí.' : 'Activa tu turno para empezar a recibir entregas.'}
        />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {ruta.map((envio, index) => {
            const pedido = entregas.get(envio.folio);
            const siguiente = pedido?.accionesDisponibles.find((estado) => ['RECOLECTADO', 'EN_CAMINO', 'ENTREGADO'].includes(estado));
            return (
              <Card key={envio.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="whitespace-nowrap font-mono text-xs font-bold text-slate-400">{envio.folio}</span>
                        {pedido && <StatusBadge status={pedido.estado} />}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">Recoge en</p>
                      <p className="text-sm font-semibold text-slate-100">{envio.origenDireccion}</p>
                      <p className="mt-1 text-xs text-slate-400">Entrega en</p>
                      <p className="text-sm font-semibold text-slate-100">{envio.destinoDireccion}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {envio.pesoKg} kg · ETA {minutes(envio.etaMinutos)} {envio.fragil && '· FRÁGIL'} {pedido && `· ${money(pedido.total)}`}
                      </p>
                    </div>
                    <Link to={`/repartidor/entregas/${envio.folio}`} className="rounded-lg p-1 text-slate-400 hover:bg-ink-700/60">
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </div>
                  {siguiente && (
                    <Button
                      className="w-full"
                      variant={siguiente === 'ENTREGADO' ? 'success' : 'primary'}
                      loading={cambiar.isPending && cambiar.variables?.folio === envio.folio}
                      onClick={() => cambiar.mutate({ folio: envio.folio, estado: siguiente })}
                    >
                      Marcar {OrderStatusLabels[siguiente].toLowerCase()}
                    </Button>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}

export function RepartidorHistorialPage() {
  const { data, isLoading } = usePedidosPanel({ pageSize: 30 });
  if (isLoading) return <PageLoader />;
  return (
    <div className="space-y-4 animate-fade-up">
      <h1 className="text-xl font-extrabold text-slate-100">Mis entregas</h1>
      {data?.items.length === 0 && <EmptyState title="Aún no tienes entregas" />}
      <div className="grid gap-2.5 lg:grid-cols-2">
        {data?.items.map((pedido) => (
          <Link key={pedido.folio} to={`/repartidor/entregas/${pedido.folio}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-ink-600/70 bg-ink-800 p-4 shadow-card">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-400">{pedido.folio}</span>
                <StatusBadge status={pedido.estado} />
              </div>
              <p className="mt-1 truncate text-sm text-slate-200">{pedido.destinoPunto.direccion}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}
