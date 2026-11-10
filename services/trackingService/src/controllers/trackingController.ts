import type { Request, Response } from 'express';
import { openSse, requireAuth } from '@rumbo/shared';
import { keys, realtime } from '../lib/infrastructure.js';
import { routeSimulator } from '../services/routeSimulator.js';
import { trackingService } from '../services/trackingService.js';

export const trackingController = {
  async get(req: Request, res: Response) {
    const { meta, posicion } = await trackingService.get(req.params.folio, requireAuth(req));
    res.json({
      folio: meta.folio,
      status: meta.status,
      medioId: meta.medioId,
      repartidorNombre: meta.repartidorNombre,
      polilinea: meta.polilinea,
      rutaEstimada: meta.rutaEstimada,
      duracionSeg: meta.duracionSeg,
      posicion,
    });
  },

  async stream(req: Request, res: Response) {
    const { posicion } = await trackingService.get(req.params.folio, requireAuth(req));
    const sse = openSse(req, res);
    if (posicion) sse.send('posicion', posicion);
    const unsubscribe = await realtime.listen(keys.canal(req.params.folio), (data) => sse.send('posicion', data));
    sse.onClose(() => void unsubscribe());
  },

  async startRoute(req: Request, res: Response) {
    res.status(201).json(await routeSimulator.start(req.params.id, requireAuth(req), Number(req.body?.velocidad ?? 1)));
  },

  async stopRoute(req: Request, res: Response) {
    res.json(await routeSimulator.stop(req.params.id, requireAuth(req)));
  },

  async routeStatus(req: Request, res: Response) {
    res.json(await routeSimulator.status(req.params.id));
  },

  /** SSE del recorrido de un repartidor: estado de las paradas + cada posición. */
  async routeStream(req: Request, res: Response) {
    const auth = requireAuth(req);
    if (auth.role === 'REPARTIDOR' && auth.userId !== req.params.id) {
      res.status(403).json({ error: { code: 'SIN_PERMISO', message: 'Solo puedes ver tu recorrido' } });
      return;
    }
    const sse = openSse(req, res);
    const estado = await routeSimulator.status(req.params.id);
    if (estado) sse.send('recorrido', { tipo: 'estado', estado });
    const unsubscribe = await realtime.listen(keys.canalRepartidor(req.params.id), (data) => sse.send('recorrido', data));
    sse.onClose(() => void unsubscribe());
  },

  async listActive(_req: Request, res: Response) {
    res.json(await trackingService.listActive());
  },

  async streamAll(req: Request, res: Response) {
    const sse = openSse(req, res);
    for (const posicion of await trackingService.listActive()) sse.send('posicion', posicion);
    const unsubscribe = await realtime.listen(keys.canalTodos, (data) => sse.send('posicion', data));
    sse.onClose(() => void unsubscribe());
  },
};
