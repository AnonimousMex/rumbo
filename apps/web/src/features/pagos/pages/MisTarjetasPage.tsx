import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, Plus, ShieldCheck, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState, Notice, PageLoader } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Misc';
import { useAuth } from '@/features/auth/hooks/AuthProvider';
import { CardFields, cardFieldsSchema, type CardFieldsInput, type CardFieldsOutput } from '../components/PaymentForm';
import { CreditCardVisual } from '../components/CreditCardVisual';
import { useAgregarTarjeta, useEliminarTarjeta, useHacerPrincipal, useTarjetas } from '../hooks/useTarjetas';

export function MisTarjetasPage() {
  const { user } = useAuth();
  const { data: tarjetas = [], isLoading } = useTarjetas();
  const agregar = useAgregarTarjeta();
  const principal = useHacerPrincipal();
  const eliminar = useEliminarTarjeta();
  const [open, setOpen] = useState(false);
  const [alias, setAlias] = useState('');
  const form = useForm<CardFieldsInput, unknown, CardFieldsOutput>({
    resolver: zodResolver(cardFieldsSchema),
    defaultValues: { numero: '', titular: user?.name ?? '', expiracion: '', cvv: '' },
  });

  const guardar = form.handleSubmit((tarjeta) =>
    agregar.mutate(
      { ...tarjeta, alias: alias || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          setAlias('');
          form.reset({ numero: '', titular: user?.name ?? '', expiracion: '', cvv: '' });
        },
      },
    ),
  );

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100">Mis tarjetas</h1>
          <p className="text-sm text-slate-400">Guarda varias tarjetas y paga con un toque.</p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={tarjetas.length >= 8}>
          <Plus className="h-4 w-4" /> Agregar tarjeta
        </Button>
      </div>

      {tarjetas.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-6 w-6" />}
          title="Aún no tienes tarjetas guardadas"
          description="Agrega una tarjeta de prueba; la próxima vez pagarás sin escribir el número."
          action={<Button onClick={() => setOpen(true)}>Agregar mi primera tarjeta</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tarjetas.map((tarjeta) => (
            <div key={tarjeta.id} className="min-w-0 space-y-2">
              <CreditCardVisual
                marca={tarjeta.marca}
                numero={`•••• •••• •••• ${tarjeta.ultimos4}`}
                titular={tarjeta.titular}
                expiracion={tarjeta.expiracion}
                alias={tarjeta.alias}
                principal={tarjeta.principal}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={tarjeta.principal ? 'secondary' : 'ghost'}
                  className="flex-1"
                  disabled={tarjeta.principal}
                  onClick={() => principal.mutate(tarjeta.id)}
                >
                  <Star className={tarjeta.principal ? 'h-3.5 w-3.5 fill-amber-400 text-amber-400' : 'h-3.5 w-3.5'} />
                  {tarjeta.principal ? 'Principal' : 'Hacer principal'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-300"
                  onClick={() => window.confirm(`¿Eliminar ${tarjeta.alias}?`) && eliminar.mutate(tarjeta.id)}
                  aria-label={`Eliminar ${tarjeta.alias}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Notice tone="info" icon={<ShieldCheck className="h-4 w-4 shrink-0" />}>
        Simulación de una pasarela real: el número completo lo guarda cifrado la «bóveda» de la pasarela; Rumbo solo conserva un token, la marca y los
        últimos 4 dígitos. Nunca se guarda el CVV.
      </Notice>

      <Modal open={open} onClose={() => setOpen(false)} title="Agregar tarjeta">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void guardar();
          }}
        >
          <Field label="Alias (opcional)" hint="Ej. Tarjeta de la oficina">
            <Input value={alias} maxLength={40} onChange={(e) => setAlias(e.target.value)} />
          </Field>
          <CardFields form={form} />
          <Button type="submit" className="w-full" loading={agregar.isPending}>
            Guardar tarjeta
          </Button>
        </form>
      </Modal>
    </div>
  );
}
