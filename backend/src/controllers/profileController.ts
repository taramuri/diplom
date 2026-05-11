import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import { saveAvatar, readFileBuffer } from '../utils/storage';
import { hashPassword, comparePassword } from '../utils/password';
import { checkPasswordStrength } from '../utils/passwordStrength';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

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
      const existing = await User.findOne({ where: { email } });
      if (existing && existing.id !== userId) {
        throw new ApiError(409, 'Цей email вже використовується');
      }
      updates.email = email;
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
 * POST /api/auth/me/password
 * Зміна паролю авторизованим юзером (знає поточний пароль).
 */
export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const { current_password, new_password } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const valid = await comparePassword(current_password, user.password_hash);
    if (!valid) {
      throw new ApiError(401, 'Поточний пароль неправильний');
    }

    if (current_password === new_password) {
      throw new ApiError(400, 'Новий пароль має відрізнятись від поточного');
    }

    const strength = checkPasswordStrength(new_password, {
      email: user.email,
      name: user.name,
    });
    if (!strength.isValid) {
      throw new ApiError(400, 'Пароль не відповідає вимогам безпеки', {
        issues: strength.issues,
      });
    }

    const password_hash = await hashPassword(new_password);
    await user.update({ password_hash });

    logger.info(`Password changed for user ${userId}`);
    res.json({ message: 'Пароль успішно змінено' });
  } catch (err) {
    next(err);
  }
}

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
