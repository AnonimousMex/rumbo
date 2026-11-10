import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { requireEnv } from '@rumbo/shared';
import { prisma } from '../lib/infrastructure.js';

/**
 * Bóveda de la pasarela SIMULADA. En la vida real esto vive en los servidores
 * del proveedor (Stripe, Conekta…): Rumbo solo recibe un token. Aquí la
 * simulamos con una tabla aparte y el número cifrado con AES-256-GCM.
 */
const key = createHash('sha256').update(`rumbo-vault:${requireEnv('INTERNAL_SERVICE_SECRET')}`).digest();

export const simulatedVault = {
  async store(numero: string): Promise<string> {
    const token = `tok_${randomBytes(12).toString('hex')}`;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const numeroCifrado = Buffer.concat([cipher.update(numero, 'utf8'), cipher.final()]).toString('base64');
    await prisma.gatewayVault.create({
      data: { token, numeroCifrado, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') },
    });
    return token;
  },

  async reveal(token: string): Promise<string | null> {
    const row = await prisma.gatewayVault.findUnique({ where: { token } });
    if (!row) return null;
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(row.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(row.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(row.numeroCifrado, 'base64')), decipher.final()]).toString('utf8');
  },

  remove: (token: string) => prisma.gatewayVault.deleteMany({ where: { token } }),
};
