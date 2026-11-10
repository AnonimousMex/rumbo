import { useEffect, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Lock, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { api, errorMessage, newIdempotencyKey } from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { useTarjetas } from '../hooks/useTarjetas';
import { CreditCardVisual } from './CreditCardVisual';

export const cardFieldsSchema = z.object({
  numero: z
    .string()
    .transform((value) => value.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{15,16}$/, 'Número de 16 dígitos')),
  titular: z.string().trim().min(3, 'Como aparece en la tarjeta'),
  expiracion: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'MM/AA'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV'),
});

export type CardFieldsInput = z.input<typeof cardFieldsSchema>;
export type CardFieldsOutput = z.output<typeof cardFieldsSchema>;

export const TEST_CARDS = [
  { numero: '4242 4242 4242 4242', label: 'Visa aprobada' },
  { numero: '5555 5555 5555 4444', label: 'Mastercard aprobada' },
  { numero: '4000 0000 0000 0002', label: 'Rechazada' },
  { numero: '4000 0000 0000 9995', label: 'Sin fondos' },
];

export const brandOf = (numero: string) => {
  const n = numero.replace(/\s/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^5[1-5]|^2[2-7]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'American Express';
  return 'Tarjeta';
};

/** Campos de tarjeta + vista previa; se usan al pagar y al guardar una tarjeta. */
export function CardFields({ form }: { form: UseFormReturn<CardFieldsInput, unknown, CardFieldsOutput> }) {
  const { errors } = form.formState;
  const numero = form.watch('numero') ?? '';
  return (
    <div className="space-y-4">
      <CreditCardVisual marca={brandOf(numero)} numero={numero || '•••• •••• •••• ••••'} titular={form.watch('titular')} expiracion={form.watch('expiracion') || 'MM/AA'} />
      <div className="flex flex-wrap gap-1.5">
        {TEST_CARDS.map((card) => (
          <button
            key={card.numero}
            type="button"
            onClick={() => form.setValue('numero', card.numero)}
            className="rounded-full border border-ink-600/70 bg-ink-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-brand-400"
          >
            {card.label} ·••{card.numero.slice(-4)}
          </button>
        ))}
      </div>
      <Field label="Número de tarjeta" error={errors.numero?.message}>
        <Input inputMode="numeric" autoComplete="cc-number" maxLength={19} {...form.register('numero')} />
      </Field>
      <Field label="Titular" error={errors.titular?.message}>
        <Input autoComplete="cc-name" {...form.register('titular')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vence" error={errors.expiracion?.message}>
          <Input placeholder="MM/AA" autoComplete="cc-exp" maxLength={5} {...form.register('expiracion')} />
        </Field>
        <Field label="CVV" error={errors.cvv?.message}>
          <Input type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} {...form.register('cvv')} />
        </Field>
      </div>
    </div>
  );
}

/**
 * Formulario de pago. Con tarjetas guardadas se elige una (la principal ya
 * viene marcada) y se paga sin volver a escribir el número; la pasarela cobra
 * con su token. La llave de idempotencia se genera una vez por intento: un
 * doble clic nunca cobra dos veces.
 */
export function PaymentForm({ folio, total, titular, onPaid }: { folio: string; total: number; titular?: string; onPaid?: () => void }) {
  const queryClient = useQueryClient();
  const keyRef = useRef(newIdempotencyKey());
  const { data: tarjetas = [], isLoading } = useTarjetas();
  const [seleccion, setSeleccion] = useState<string | 'nueva' | null>(null);
  const [guardar, setGuardar] = useState(true);
  const form = useForm<CardFieldsInput, unknown, CardFieldsOutput>({
    resolver: zodResolver(cardFieldsSchema),
    defaultValues: { numero: '4242 4242 4242 4242', titular: titular ?? '', expiracion: '12/29', cvv: '123' },
  });

  useEffect(() => {
    if (seleccion === null && !isLoading) setSeleccion(tarjetas.find((t) => t.principal)?.id ?? tarjetas[0]?.id ?? 'nueva');
  }, [isLoading, tarjetas, seleccion]);

  const pay = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post('/pagos', { folio, ...body }, { headers: { 'Idempotency-Key': keyRef.current } }).then((r) => r.data),
    onSuccess: () => {
      toast.success('¡Pago confirmado! Buscando al mejor repartidor…');
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['bff'] });
      queryClient.invalidateQueries({ queryKey: ['pagos', 'tarjetas'] });
      onPaid?.();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      // Pago rechazado = intento terminado: el siguiente intento lleva llave nueva.
      keyRef.current = newIdempotencyKey();
    },
  });

  const submit = () => {
    if (seleccion && seleccion !== 'nueva') {
      pay.mutate({ tarjetaGuardadaId: seleccion });
      return;
    }
    void form.handleSubmit((tarjeta) => pay.mutate({ tarjeta, guardarTarjeta: guardar }))();
  };

  return (
    <div className="space-y-4">
      {tarjetas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300">Tus tarjetas</p>
          {tarjetas.map((tarjeta) => (
            <button
              key={tarjeta.id}
              type="button"
              onClick={() => setSeleccion(tarjeta.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition',
                seleccion === tarjeta.id ? 'border-brand-500 bg-brand-500/10' : 'border-ink-600/70 bg-ink-800 hover:border-ink-600',
              )}
            >
              <span className="flex h-9 w-12 items-center justify-center rounded-md bg-ink-900 text-[10px] font-bold text-white">{tarjeta.marca.slice(0, 4).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-100">{tarjeta.alias}</span>
                <span className="block text-xs text-slate-400">
                  •••• {tarjeta.ultimos4} · vence {tarjeta.expiracion} {tarjeta.principal && '· principal'}
                </span>
              </span>
              {seleccion === tarjeta.id && <Check className="h-5 w-5 text-brand-500" />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSeleccion('nueva')}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left text-sm font-semibold transition',
              seleccion === 'nueva' ? 'border-brand-500 bg-brand-500/10 text-brand-300' : 'border-ink-600 text-slate-300 hover:border-slate-500',
            )}
          >
            <Plus className="h-5 w-5" /> Usar otra tarjeta
          </button>
        </div>
      )}

      {(seleccion === 'nueva' || tarjetas.length === 0) && (
        <>
          <CardFields form={form} />
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={guardar} onChange={(e) => setGuardar(e.target.checked)} />
            Guardar esta tarjeta para mis próximos envíos
          </label>
        </>
      )}

      <Button type="button" size="lg" className="w-full" loading={pay.isPending} onClick={submit}>
        <Lock className="h-4 w-4" /> Pagar {money(total)}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Rumbo solo guarda un token y los últimos 4 dígitos. Un doble clic nunca genera dos cargos.
      </p>
    </div>
  );
}
