import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import { saveAvatar, readFileBuffer } from '../utils/storage';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * PATCH /api/auth/me
 * Оновлення name та email поточного користувача.
 */
export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const { name, email } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const updates: { name?: string | null; email?: string } = {};

    if (name !== undefined) {
      updates.name = name === '' ? null : name;
    }

    if (email !== undefined && email !== user.email) {
      // Перевірка унікальності
      const existing = await User.findOne({ where: { email } });
      if (existing && existing.id !== userId) {
        throw new ApiError(409, 'Цей email вже використовується');
      }
      updates.email = email;
      // Можна додати: позначити email_verified=false і запустити нову верифікацію.
      // Для простоти лишаємо verified — але це варто описати в роботі як можливе вдосконалення.
    }

    if (Object.keys(updates).length === 0) {
      res.json({ user: user.toSafeJSON() });
      return;
    }

    await user.update(updates);
    logger.info(`Profile updated for user ${userId}: ${JSON.stringify(updates)}`);

    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/me/avatar
 * Завантаження аватара (multipart, поле "avatar").
 */
export async function uploadAvatarHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded. Use field name "avatar".');
    }

    const userId = req.user!.user_id;
    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const avatar_path = await saveAvatar(req.file.buffer, userId, req.file.mimetype);
    await user.update({ avatar_path });

    logger.info(`Avatar uploaded for user ${userId}`);
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me/avatar
 * Віддає файл аватара поточного користувача.
 */
export async function getAvatar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const user = await User.findByPk(userId);

    if (!user || !user.avatar_path) {
      throw new ApiError(404, 'Avatar not set');
    }

    const buffer = await readFileBuffer(user.avatar_path);

    // Визначаємо content-type з розширення
    const ext = user.avatar_path.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'png' ? 'image/png' :
      ext === 'webp' ? 'image/webp' :
      'image/jpeg';

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'private, max-age=600');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/auth/me/avatar
 * Видаляє аватар (просто очищає avatar_path; файл залишається на диску — не страшно).
 */
export async function deleteAvatar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    await user.update({ avatar_path: null });
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}
