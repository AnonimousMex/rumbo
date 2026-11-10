import { randomUUID } from 'node:crypto';
import { simulatedVault } from './simulatedVault.js';

export interface CardData {
  numero: string;
  titular: string;
  expiracion: string;
  cvv: string;
}

export type ChargeResult =
  | { aprobado: true; referencia: string; marca: string; ultimos4: string }
  | { aprobado: false; motivo: string; marca: string; ultimos4: string };

/**
 * Puerto hacia la pasarela de pagos (Adapter). Hoy es un simulador; mañana
 * puede ser Stripe, Conekta u OpenPay sin tocar el servicio de pagos.
 */
export type TokenizeResult =
  | { ok: true; token: string; marca: string; ultimos4: string }
  | { ok: false; motivo: string; marca: string; ultimos4: string };

export interface PaymentGateway {
  readonly nombre: string;
  charge(card: CardData, monto: number): Promise<ChargeResult>;
  /** Guarda la tarjeta en la bóveda del proveedor y devuelve un token. */
  tokenize(card: CardData): Promise<TokenizeResult>;
  /** Cobra con una tarjeta guardada (sin volver a pedir el número). */
  chargeToken(token: string, expiracion: string, monto: number): Promise<ChargeResult>;
  forget(token: string): Promise<void>;
  refund(referencia: string, monto: number): Promise<{ ok: boolean }>;
}

export function luhnValid(numero: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = numero.length - 1; i >= 0; i -= 1) {
    let digit = Number(numero[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function cardBrand(numero: string): string {
  if (/^4/.test(numero)) return 'Visa';
  if (/^5[1-5]|^2[2-7]/.test(numero)) return 'Mastercard';
  if (/^3[47]/.test(numero)) return 'American Express';
  return 'Tarjeta';
}

/** Tarjetas de prueba con resultado fijo (como en las pasarelas reales). */
export const TARJETAS_PRUEBA: Record<string, string | null> = {
  '4242424242424242': null,
  '5555555555554444': null,
  '4000000000000002': 'Tarjeta rechazada por el banco emisor',
  '4000000000009995': 'Fondos insuficientes',
  '4000000000000069': 'Tarjeta vencida',
};

export class SimulatedCardGateway implements PaymentGateway {
  readonly nombre = 'Pasarela simulada Rumbo Pay';

  /** Reglas del "banco": número válido, no vencida y tarjetas de prueba con resultado fijo. */
  private review(numero: string, expiracion: string, monto: number): string | null {
    if (!luhnValid(numero)) return 'Número de tarjeta inválido';
    const [mes, anio] = expiracion.split('/').map(Number);
    if (new Date(2000 + anio, mes, 0, 23, 59, 59) < new Date()) return 'Tarjeta vencida';
    if (monto <= 0) return 'Monto inválido';
    return TARJETAS_PRUEBA[numero] ?? null;
  }

  private delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 400));

  async charge(card: CardData, monto: number): Promise<ChargeResult> {
    await this.delay(700);
    const marca = cardBrand(card.numero);
    const ultimos4 = card.numero.slice(-4);
    const motivo = this.review(card.numero, card.expiracion, monto);
    if (motivo) return { aprobado: false, motivo, marca, ultimos4 };
    return { aprobado: true, referencia: `RP-${randomUUID().slice(0, 13).toUpperCase()}`, marca, ultimos4 };
  }

  async tokenize(card: CardData): Promise<TokenizeResult> {
    await this.delay(400);
    const marca = cardBrand(card.numero);
    const ultimos4 = card.numero.slice(-4);
    if (!luhnValid(card.numero)) return { ok: false, motivo: 'Número de tarjeta inválido', marca, ultimos4 };
    const [mes, anio] = card.expiracion.split('/').map(Number);
    if (new Date(2000 + anio, mes, 0, 23, 59, 59) < new Date()) return { ok: false, motivo: 'Tarjeta vencida', marca, ultimos4 };
    return { ok: true, token: await simulatedVault.store(card.numero), marca, ultimos4 };
  }

  async chargeToken(token: string, expiracion: string, monto: number): Promise<ChargeResult> {
    const numero = await simulatedVault.reveal(token);
    if (!numero) return { aprobado: false, motivo: 'La tarjeta guardada ya no existe', marca: 'Tarjeta', ultimos4: '????' };
    return this.charge({ numero, expiracion, titular: '', cvv: '' }, monto);
  }

  async forget(token: string): Promise<void> {
    await simulatedVault.remove(token);
  }

  async refund(): Promise<{ ok: boolean }> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true };
  }
}
