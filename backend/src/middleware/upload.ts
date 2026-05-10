import multer from 'multer';
import { Request } from 'express';

const ALLOWED_IMAGE_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10', 10);
const MAX_AVATAR_SIZE_MB = 2;

/** Аплоад зображення для аналізу — до 10 МБ. */
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req: Request, file, cb) => {
    if (!ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_IMAGE_MIMETYPES.join(', ')}`
        )
      );
      return;
    }
    cb(null, true);
  },
});

/** Аплоад аватара профілю — до 2 МБ. */
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AVATAR_SIZE_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req: Request, file, cb) => {
    if (!ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
      cb(
        new Error(
          `Invalid avatar type: ${file.mimetype}. Allowed: ${ALLOWED_IMAGE_MIMETYPES.join(', ')}`
        )
      );
      return;
    }
    cb(null, true);
  },
});
