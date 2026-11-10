import { SimulatedCardGateway, type PaymentGateway } from './paymentGateway.js';

/** Única instancia de la pasarela: cambiar de proveedor es cambiar esta línea. */
export const gateway: PaymentGateway = new SimulatedCardGateway();
