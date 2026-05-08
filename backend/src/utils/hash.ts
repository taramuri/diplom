import crypto from 'crypto';

/**
 * SHA-256 хеш буфера у hex форматі.
 * Використовується для дедуплікації завантажених зображень.
 */
export function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
