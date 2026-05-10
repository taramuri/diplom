import crypto from 'crypto';

/**
 * Генерує криптографічно стійкий випадковий токен у hex-форматі.
 * 32 байти → 64 hex-символи.
 */
export function generateRandomToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Дата на N годин у майбутньому — для expires-полів.
 */
export function expiresInHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
