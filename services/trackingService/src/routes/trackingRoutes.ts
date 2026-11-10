import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, requireRole, validateRequest } from '@rumbo/shared';
import { trackingController } from '../controllers/trackingController.js';

const folioParams = z.object({
  folio: z.string().trim().toUpperCase().regex(/^RB-\d{4}-\d{6}$/, 'Folio inválido'),
});

const repartidorParams = z.object({ id: z.string().uuid('Repartidor inválido') });
const velocidadBody = z.object({ velocidad: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(1) });

export const trackingRoutes = Router();

// Simulador del recorrido completo de un repartidor (piloto automático).
trackingRoutes.post(
  '/repartidores/:id/simular',
  requireRole('REPARTIDOR', 'ADMIN'),
  validateRequest({ params: repartidorParams, body: velocidadBody }),
  asyncHandler(trackingController.startRoute),
);
trackingRoutes.post('/repartidores/:id/detener', requireRole('REPARTIDOR', 'ADMIN'), validateRequest({ params: repartidorParams }), asyncHandler(trackingController.stopRoute));
trackingRoutes.get('/repartidores/:id/recorrido', requireRole('REPARTIDOR', 'ADMIN'), validateRequest({ params: repartidorParams }), asyncHandler(trackingController.routeStatus));
trackingRoutes.get('/repartidores/:id/stream', requireRole('REPARTIDOR', 'ADMIN'), validateRequest({ params: repartidorParams }), asyncHandler(trackingController.routeStream));

trackingRoutes.get('/', requireRole('ADMIN'), asyncHandler(trackingController.listActive));
trackingRoutes.get('/en-vivo/todos', requireRole('ADMIN'), asyncHandler(trackingController.streamAll));
trackingRoutes.get('/:folio', validateRequest({ params: folioParams }), asyncHandler(trackingController.get));
trackingRoutes.get('/:folio/stream', validateRequest({ params: folioParams }), asyncHandler(trackingController.stream));
