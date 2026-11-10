import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/apiClient';
import { pagosApi, type TarjetaGuardada } from '../api/pagosApi';

const KEY = ['pagos', 'tarjetas'] as const;

export const useTarjetas = () => useQuery({ queryKey: KEY, queryFn: pagosApi.tarjetas });

export function useAgregarTarjeta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pagosApi.agregar,
    onSuccess: (tarjeta) => {
      toast.success(`${tarjeta.alias} guardada`);
      queryClient.invalidateQueries({ queryKey: KEY });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/** Optimista: la estrella cambia al instante; si el servidor falla, se revierte. */
export function useHacerPrincipal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pagosApi.hacerPrincipal,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<TarjetaGuardada[]>(KEY);
      queryClient.setQueryData<TarjetaGuardada[]>(KEY, (old) => old?.map((t) => ({ ...t, principal: t.id === id })));
      return { previous };
    },
    onError: (error, _id, context) => {
      queryClient.setQueryData(KEY, context?.previous);
      toast.error(errorMessage(error));
    },
    onSuccess: (lista) => queryClient.setQueryData(KEY, lista),
  });
}

export function useEliminarTarjeta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pagosApi.eliminar,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<TarjetaGuardada[]>(KEY);
      queryClient.setQueryData<TarjetaGuardada[]>(KEY, (old) => old?.filter((t) => t.id !== id));
      return { previous };
    },
    onError: (error, _id, context) => {
      queryClient.setQueryData(KEY, context?.previous);
      toast.error(errorMessage(error));
    },
    onSuccess: (lista) => {
      queryClient.setQueryData(KEY, lista);
      toast.success('Tarjeta eliminada');
    },
  });
}
