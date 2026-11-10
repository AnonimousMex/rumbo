import { api } from '@/lib/apiClient';

export interface TarjetaGuardada {
  id: string;
  alias: string;
  marca: string;
  ultimos4: string;
  titular: string;
  expiracion: string;
  principal: boolean;
  creada: string;
}

export interface NuevaTarjeta {
  numero: string;
  titular: string;
  expiracion: string;
  cvv: string;
  alias?: string;
}

export const pagosApi = {
  tarjetas: () => api.get<TarjetaGuardada[]>('/pagos/tarjetas').then((r) => r.data),
  agregar: (body: NuevaTarjeta) => api.post<TarjetaGuardada>('/pagos/tarjetas', body).then((r) => r.data),
  hacerPrincipal: (id: string) => api.patch<TarjetaGuardada[]>(`/pagos/tarjetas/${id}/principal`).then((r) => r.data),
  eliminar: (id: string) => api.delete<TarjetaGuardada[]>(`/pagos/tarjetas/${id}`).then((r) => r.data),
};
