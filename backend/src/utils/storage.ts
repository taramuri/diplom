import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const IMAGES_DIR = path.join(UPLOAD_DIR, 'images');
const HEATMAPS_DIR = path.join(UPLOAD_DIR, 'heatmaps');

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Зберігає завантажене зображення на диск.
 * Шлях: uploads/images/{userId}/{hash}.{ext}
 */
export async function saveImage(
  buffer: Buffer,
  userId: number,
  hash: string,
  mimetype: string
): Promise<string> {
  const userDir = path.join(IMAGES_DIR, String(userId));
  await ensureDir(userDir);
  const ext = MIME_TO_EXT[mimetype] || 'bin';
  const filepath = path.join(userDir, `${hash}.${ext}`);
  await fs.writeFile(filepath, buffer);
  return filepath;
}

/**
 * Декодує base64 PNG (з ML-сервісу) і зберігає на диск.
 * Шлях: uploads/heatmaps/{userId}/{analysisId}.png
 */
export async function saveHeatmap(
  base64Png: string,
  userId: number,
  analysisId: number
): Promise<string> {
  const userDir = path.join(HEATMAPS_DIR, String(userId));
  await ensureDir(userDir);
  const filepath = path.join(userDir, `${analysisId}.png`);
  await fs.writeFile(filepath, Buffer.from(base64Png, 'base64'));
  return filepath;
}

/**
 * Читає файл теплокарти з диска для віддачі клієнту.
 */
export async function readHeatmap(filepath: string): Promise<Buffer> {
  return fs.readFile(filepath);
}
