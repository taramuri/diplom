import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const IMAGES_DIR = path.join(UPLOAD_DIR, 'images');
const HEATMAPS_DIR = path.join(UPLOAD_DIR, 'heatmaps');
const AVATARS_DIR = path.join(UPLOAD_DIR, 'avatars');

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export function mimeToExt(mimetype: string): string {
  return MIME_TO_EXT[mimetype] || 'bin';
}

/** Зберігає завантажене зображення (для аналізу) на диск. */
export async function saveImage(
  buffer: Buffer,
  userId: number,
  hash: string,
  mimetype: string
): Promise<string> {
  const userDir = path.join(IMAGES_DIR, String(userId));
  await ensureDir(userDir);
  const ext = mimeToExt(mimetype);
  const filepath = path.join(userDir, `${hash}.${ext}`);
  await fs.writeFile(filepath, buffer);
  return filepath;
}

/** Декодує base64 PNG (з ML-сервісу) і зберігає на диск. */
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

/** Зберігає avatar (фото профілю) на диск. */
export async function saveAvatar(
  buffer: Buffer,
  userId: number,
  mimetype: string
): Promise<string> {
  await ensureDir(AVATARS_DIR);
  const ext = mimeToExt(mimetype);
  // Стираємо попередні аватари будь-якого розширення
  for (const oldExt of Object.values(MIME_TO_EXT)) {
    const oldPath = path.join(AVATARS_DIR, `${userId}.${oldExt}`);
    try {
      await fs.unlink(oldPath);
    } catch {
      // не існує — ок
    }
  }
  const filepath = path.join(AVATARS_DIR, `${userId}.${ext}`);
  await fs.writeFile(filepath, buffer);
  return filepath;
}

/** Читає файл за шляхом (heatmap або avatar). */
export async function readFileBuffer(filepath: string): Promise<Buffer> {
  return fs.readFile(filepath);
}

// Backwards compat alias
export const readHeatmap = readFileBuffer;
