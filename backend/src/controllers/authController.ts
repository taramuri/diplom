import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { User } from '../models';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { generateRandomToken, expiresInHours } from '../utils/randomToken';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const VERIFICATION_EXPIRES_HOURS = 24;
const PASSWORD_RESET_EXPIRES_HOURS = 1;

/**
 * POST /api/auth/register
 * Створює нового користувача, надсилає лист з підтвердженням.
 * НЕ повертає токен — користувач має спочатку підтвердити email.
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password, name } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw new ApiError(409, 'Email вже зареєстровано');
    }

    const password_hash = await hashPassword(password);
    const verification_token = generateRandomToken();
    const verification_token_expires = expiresInHours(VERIFICATION_EXPIRES_HOURS);

    const user = await User.create({
      email,
      password_hash,
      name: name || null,
      email_verified: false,
      verification_token,
      verification_token_expires,
    });

    // Надсилаємо лист — якщо не вдалось, видаляємо юзера і кидаємо помилку
    try {
      await sendVerificationEmail(email, user.name, verification_token);
    } catch (emailErr) {
      logger.error(`Failed to send verification email — rolling back user`);
      await user.destroy();
      throw new ApiError(
        500,
        'Не вдалось надіслати лист підтвердження. Спробуй пізніше.'
      );
    }

    logger.info(`New user registered (pending verification): ${email}`);
    res.status(201).json({
      message: 'Реєстрація успішна. Перевір пошту — ми надіслали лист для підтвердження.',
      email,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Логін: повертає JWT, але тільки для верифікованих email.
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new ApiError(401, 'Неправильний email або пароль');
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      throw new ApiError(401, 'Неправильний email або пароль');
    }

    if (!user.email_verified) {
      // Спеціальний код помилки щоб фронт міг показати кнопку "надіслати знову"
      res.status(403).json({
        error: 'Email не підтверджено',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
      return;
    }

    const token = signToken({
      user_id: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`User logged in: ${email}`);
    res.json({ user: user.toSafeJSON(), token });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Повертає поточного користувача.
 */
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await User.findByPk(req.user!.user_id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-email
 * Тіло: { token }. Підтверджує email.
 */
export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      where: {
        verification_token: token,
        verification_token_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      throw new ApiError(400, 'Недійсний або прострочений токен підтвердження');
    }

    await user.update({
      email_verified: true,
      verification_token: null,
      verification_token_expires: null,
    });

    // Логінимо одразу — повертаємо токен
    const jwtToken = signToken({
      user_id: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`Email verified: ${user.email}`);
    res.json({
      message: 'Email успішно підтверджено',
      user: user.toSafeJSON(),
      token: jwtToken,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/resend-verification
 * Тіло: { email }. Генерує новий токен і надсилає лист.
 */
export async function resendVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    // Не розкриваємо чи юзер існує — однакова відповідь для безпеки
    const successResponse = {
      message: 'Якщо email зареєстровано і не підтверджено — надіслали новий лист.',
    };

    if (!user || user.email_verified) {
      res.json(successResponse);
      return;
    }

    const verification_token = generateRandomToken();
    const verification_token_expires = expiresInHours(VERIFICATION_EXPIRES_HOURS);

    await user.update({ verification_token, verification_token_expires });

    try {
      await sendVerificationEmail(email, user.name, verification_token);
    } catch (emailErr) {
      logger.error(`Failed to resend verification to ${email}: ${emailErr}`);
      throw new ApiError(500, 'Не вдалось надіслати лист');
    }

    logger.info(`Verification email resent to ${email}`);
    res.json(successResponse);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 * Тіло: { email }. Надсилає лист зі скиданням паролю.
 */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    // Не розкриваємо чи email зареєстровано
    const successResponse = {
      message: 'Якщо email зареєстровано — надіслали лист зі скиданням паролю.',
    };

    if (!user) {
      res.json(successResponse);
      return;
    }

    const password_reset_token = generateRandomToken();
    const password_reset_expires = expiresInHours(PASSWORD_RESET_EXPIRES_HOURS);

    await user.update({ password_reset_token, password_reset_expires });

    try {
      await sendPasswordResetEmail(email, user.name, password_reset_token);
    } catch (emailErr) {
      logger.error(`Failed to send reset email to ${email}: ${emailErr}`);
      throw new ApiError(500, 'Не вдалось надіслати лист');
    }

    logger.info(`Password reset email sent to ${email}`);
    res.json(successResponse);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 * Тіло: { token, new_password }. Скидає пароль за токеном.
 */
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, new_password } = req.body;

    const user = await User.findOne({
      where: {
        password_reset_token: token,
        password_reset_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      throw new ApiError(400, 'Недійсний або прострочений токен скидання паролю');
    }

    const password_hash = await hashPassword(new_password);

    await user.update({
      password_hash,
      password_reset_token: null,
      password_reset_expires: null,
    });

    logger.info(`Password reset for ${user.email}`);
    res.json({ message: 'Пароль успішно змінено. Можеш увійти з новим паролем.' });
  } catch (err) {
    next(err);
  }
}
