import { Router } from 'express';
import { asyncHandler, requireRole, validateRequest } from '@rumbo/shared';
import { paymentController } from '../controllers/paymentController.js';
import { addCardSchema, cardIdParamsSchema, chargeSchema, folioParamsSchema } from '../schemas/paymentSchemas.js';

export const paymentRoutes = Router();

paymentRoutes.post('/', requireRole('CLIENTE'), validateRequest({ body: chargeSchema }), asyncHandler(paymentController.charge));
paymentRoutes.get('/tarjetas-prueba', paymentController.testCards);
paymentRoutes.get('/tarjetas', requireRole('CLIENTE'), asyncHandler(paymentController.listCards));
paymentRoutes.post('/tarjetas', requireRole('CLIENTE'), validateRequest({ body: addCardSchema }), asyncHandler(paymentController.addCard));
paymentRoutes.patch('/tarjetas/:id/principal', requireRole('CLIENTE'), validateRequest({ params: cardIdParamsSchema }), asyncHandler(paymentController.setPrincipal));
paymentRoutes.delete('/tarjetas/:id', requireRole('CLIENTE'), validateRequest({ params: cardIdParamsSchema }), asyncHandler(paymentController.removeCard));
paymentRoutes.get('/pedido/:folio', validateRequest({ params: folioParamsSchema }), asyncHandler(paymentController.listForOrder));
paymentRoutes.get('/', requireRole('ADMIN'), asyncHandler(paymentController.listAll));
