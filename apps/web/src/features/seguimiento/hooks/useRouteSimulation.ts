import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/apiClient';
import { openStream } from '@/lib/sse';
import type { Posicion } from '@/types/api';

export interface ParadaRecorrido {
  folio: string;
  tipo: 'RECOGER' | 'ENTREGAR';
  direccion: string;
  lat: number;
  lng: number;
  estado: 'PENDIENTE' | 'EN_CURSO' | 'HECHA';
}

export interface EstadoRecorrido {
  repartidorId: string;
  repartidorNombre: string;
  medioId: string;
  estado: 'EN_CURSO' | 'COMPLETADO' | 'DETENIDO' | 'FALLIDO';
  velocidad: number;
  base: { nombre: string; lat: number; lng: number };
  paradas: ParadaRecorrido[];
  paradaActual: number;
  kmRecorridos: number;
  mensaje: string;
  error?: string;
}

type Coord = [number, number];

/**
 * Sigue en vivo el recorrido simulado de un repartidor (SSE): estado de cada
 * parada, posición del vehículo y el trayecto que ya recorrió.
 */
export function useRouteSimulation(repartidorId: string | undefined) {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoRecorrido | null>(null);
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [recorrido, setRecorrido] = useState<Coord[]>([]);
  const [tramo, setTramo] = useState<Coord[]>([]);

  useEffect(() => {
    if (!repartidorId) return;
    let ultimaParada = -1;
    const refrescar = () => {
      queryClient.invalidateQueries({ queryKey: ['bff'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['asignacion'] });
    };
    return openStream(`/seguimiento/repartidores/${repartidorId}/stream`, {
      onEvent: (event, data) => {
        if (event !== 'recorrido') return;
        const mensaje = data as { tipo: 'estado' | 'posicion'; estado?: EstadoRecorrido; posicion?: Posicion & { tramo?: Coord[] } };
        if (mensaje.tipo === 'estado' && mensaje.estado) {
          setEstado(mensaje.estado);
          if (mensaje.estado.paradaActual !== ultimaParada) {
            ultimaParada = mensaje.estado.paradaActual;
            refrescar();
            // Despacho actualiza el envío por evento un instante después: segunda recarga.
            window.setTimeout(refrescar, 1500);
          }
        }
        if (mensaje.tipo === 'posicion' && mensaje.posicion) {
          const p = mensaje.posicion;
          if (p.tramo) setTramo(p.tramo);
          setPosicion(p);
          setRecorrido((actual) => [...actual, [p.lat, p.lng]]);
        }
      },
    });
  }, [repartidorId, queryClient]);

  const iniciar = useMutation({
    mutationFn: (velocidad: 1 | 2 | 4) =>
      api.post<EstadoRecorrido>(`/seguimiento/repartidores/${repartidorId}/simular`, { velocidad }).then((r) => r.data),
    onMutate: () => {
      setRecorrido([]);
      setTramo([]);
      setPosicion(null);
    },
    onSuccess: (data) => {
      setEstado(data);
      toast.success(`Recorrido iniciado: ${data.paradas.length} paradas`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const detener = useMutation({
    mutationFn: () => api.post<EstadoRecorrido | null>(`/seguimiento/repartidores/${repartidorId}/detener`).then((r) => r.data),
    onSuccess: (data) => data && setEstado(data),
    onError: (error) => toast.error(errorMessage(error)),
  });

  return { estado, posicion, recorrido, tramo, iniciar, detener, activo: estado?.estado === 'EN_CURSO' };
}
