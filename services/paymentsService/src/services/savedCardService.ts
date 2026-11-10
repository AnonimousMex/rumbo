import { ConflictError, NotFoundError, PaymentDeclinedError, type AuthContext } from '@rumbo/shared';
import { gateway } from '../gateways/gatewayInstance.js';
import type { CardData } from '../gateways/paymentGateway.js';
import { prisma } from '../lib/infrastructure.js';
import type { SavedCard } from '../generated/prisma/index.js';

const MAX_TARJETAS = 8;

/** Lo único que el navegador ve de una tarjeta guardada: nunca el token ni el número. */
export const publicCard = (card: SavedCard) => ({
  id: card.id,
  alias: card.alias,
  marca: card.marca,
  ultimos4: card.ultimos4,
  titular: card.titular,
  expiracion: card.expiracion,
  principal: card.principal,
  creada: card.createdAt,
});

export const savedCardService = {
  async list(auth: AuthContext) {
    const cards = await prisma.savedCard.findMany({
      where: { clienteId: auth.userId },
      orderBy: [{ principal: 'desc' }, { createdAt: 'desc' }],
    });
    return cards.map(publicCard);
  },

  /** Registra una tarjeta: la pasarela la valida y la guarda en su bóveda; Rumbo guarda el token. */
  async add(auth: AuthContext, card: CardData, alias?: string) {
    const count = await prisma.savedCard.count({ where: { clienteId: auth.userId } });
    if (count >= MAX_TARJETAS) throw new ConflictError(`Puedes guardar hasta ${MAX_TARJETAS} tarjetas`, 'LIMITE_TARJETAS');

    const result = await gateway.tokenize(card);
    if (!result.ok) throw new PaymentDeclinedError(result.motivo);

    const duplicate = await prisma.savedCard.findFirst({
      where: { clienteId: auth.userId, ultimos4: result.ultimos4, marca: result.marca, expiracion: card.expiracion },
    });
    if (duplicate) {
      await gateway.forget(result.token);
      throw new ConflictError('Esa tarjeta ya está guardada', 'TARJETA_DUPLICADA');
    }

    const saved = await prisma.savedCard.create({
      data: {
        clienteId: auth.userId,
        alias: alias?.trim() || `${result.marca} ${result.ultimos4}`,
        marca: result.marca,
        ultimos4: result.ultimos4,
        titular: card.titular,
        expiracion: card.expiracion,
        token: result.token,
        principal: count === 0,
      },
    });
    return publicCard(saved);
  },

  async ownCard(auth: AuthContext, id: string) {
    const card = await prisma.savedCard.findFirst({ where: { id, clienteId: auth.userId } });
    if (!card) throw new NotFoundError('Tarjeta no encontrada');
    return card;
  },

  async setPrincipal(auth: AuthContext, id: string) {
    await this.ownCard(auth, id);
    await prisma.$transaction([
      prisma.savedCard.updateMany({ where: { clienteId: auth.userId }, data: { principal: false } }),
      prisma.savedCard.update({ where: { id }, data: { principal: true } }),
    ]);
    return this.list(auth);
  },

  async remove(auth: AuthContext, id: string) {
    const card = await this.ownCard(auth, id);
    await prisma.savedCard.delete({ where: { id } });
    await gateway.forget(card.token);
    if (card.principal) {
      const next = await prisma.savedCard.findFirst({ where: { clienteId: auth.userId }, orderBy: { createdAt: 'desc' } });
      if (next) await prisma.savedCard.update({ where: { id: next.id }, data: { principal: true } });
    }
    return this.list(auth);
  },
};
