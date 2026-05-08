import multer from 'multer';
import { Request } from 'express';

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10', 10);

/**
 * Multer middleware для завантаження одного зображення.
 * Зберігає в памʼять (Buffer), щоб одразу обчислити хеш і передати в ML.
 */
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req: Request, file, cb) => {
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIMETYPES.join(', ')}`
        )
      );
      return;
    }
    cb(null, true);
  },
});
