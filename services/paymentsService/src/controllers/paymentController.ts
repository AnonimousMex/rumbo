import type { Request, Response } from 'express';
import { requireAuth } from '@rumbo/shared';
import { TARJETAS_PRUEBA } from '../gateways/paymentGateway.js';
import { idempotencyKeySchema } from '../schemas/paymentSchemas.js';
import { paymentService } from '../services/paymentService.js';
import { savedCardService } from '../services/savedCardService.js';

export const paymentController = {
  async charge(req: Request, res: Response) {
    const key = idempotencyKeySchema.parse(req.header('idempotency-key'));
    const result = await paymentService.charge(req.body, requireAuth(req), key);
    if (result.replayed) res.setHeader('Idempotent-Replayed', 'true');
    res.status(result.status).json(result.body);
  },

  async listForOrder(req: Request, res: Response) {
    res.json(await paymentService.listForOrder(req.params.folio, requireAuth(req)));
  },

  async listAll(_req: Request, res: Response) {
    res.json(await paymentService.listAll());
  },

  async listCards(req: Request, res: Response) {
    res.json(await savedCardService.list(requireAuth(req)));
  },

  async addCard(req: Request, res: Response) {
    const { alias, ...card } = req.body;
    res.status(201).json(await savedCardService.add(requireAuth(req), card, alias));
  },

  async setPrincipal(req: Request, res: Response) {
    res.json(await savedCardService.setPrincipal(requireAuth(req), req.params.id));
  },

  async removeCard(req: Request, res: Response) {
    res.json(await savedCardService.remove(requireAuth(req), req.params.id));
  },

  testCards(_req: Request, res: Response) {
    res.json(
      Object.entries(TARJETAS_PRUEBA).map(([numero, rechazo]) => ({
        numero,
        resultado: rechazo ?? 'Aprobada',
        aprobada: rechazo === null,
      })),
    );
  },
};
