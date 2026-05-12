import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

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

export async function saveAvatar(
  buffer: Buffer,
  userId: number,
  mimetype: string
): Promise<string> {
  await ensureDir(AVATARS_DIR);
  const ext = mimeToExt(mimetype);
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

export async function readFileBuffer(filepath: string): Promise<Buffer> {
  return fs.readFile(filepath);
}

export const readHeatmap = readFileBuffer;

/**
 * Безпечно видаляє файл — ігнорує помилку якщо файла нема.
 */
export async function deleteFileIfExists(filepath: string | null | undefined): Promise<void> {
  if (!filepath) return;
  try {
    await fs.unlink(filepath);
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      logger.warn(`Failed to delete file ${filepath}: ${err.message}`);
    }
  }
}
