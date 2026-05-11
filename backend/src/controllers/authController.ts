import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { User } from '../models';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { generateRandomToken, expiresInHours } from '../utils/randomToken';
import { checkPasswordStrength } from '../utils/passwordStrength';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// Один інтервал чекання для всіх типів email-розсилок
const EMAIL_COOLDOWN_SECONDS = 90;
const VERIFICATION_EXPIRES_HOURS = 1;
const PASSWORD_RESET_EXPIRES_HOURS = 1;

/**
 * Перевіряє чи можна надіслати email цьому юзеру (rate limit за 90 секунд).
 * Кидає ApiError 429 якщо ще зарано.
 */
function assertEmailCooldown(user: User): void {
  if (!user.last_email_sent_at) return;
  const sinceMs = Date.now() - user.last_email_sent_at.getTime();
  const sinceSeconds = Math.floor(sinceMs / 1000);
  if (sinceSeconds < EMAIL_COOLDOWN_SECONDS) {
    const retryAfter = EMAIL_COOLDOWN_SECONDS - sinceSeconds;
    const err = new ApiError(
      429,
      `Зачекай ${retryAfter} секунд перед повторною спробою`,
      { code: 'RATE_LIMITED', retry_after_seconds: retryAfter }
    );
    throw err;
  }
}

/**
 * POST /api/auth/register
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

    // Перевірка складності пароля
    const strength = checkPasswordStrength(password, { email, name });
    if (!strength.isValid) {
      throw new ApiError(400, 'Пароль не відповідає вимогам безпеки', {
        issues: strength.issues,
      });
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
      last_email_sent_at: new Date(),
    });

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
 *
 * Тепер РОЗКРИВАЄ чи email зареєстровано — UX важливіший за email enumeration
 * (для цього диплома з обмеженою аудиторією це прийнятний trade-off).
 */
export async function resendVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new ApiError(
        404,
        'Користувача з такою поштою не знайдено. Можливо, ти ще не реєструвалась?',
        { code: 'EMAIL_NOT_FOUND' }
      );
    }

    if (user.email_verified) {
      throw new ApiError(
        400,
        'Email вже підтверджено — можна одразу логінитись.',
        { code: 'ALREADY_VERIFIED' }
      );
    }

    assertEmailCooldown(user);

    const verification_token = generateRandomToken();
    const verification_token_expires = expiresInHours(VERIFICATION_EXPIRES_HOURS);

    await user.update({
      verification_token,
      verification_token_expires,
      last_email_sent_at: new Date(),
    });

    try {
      await sendVerificationEmail(email, user.name, verification_token);
    } catch (emailErr) {
      logger.error(`Failed to resend verification to ${email}: ${emailErr}`);
      throw new ApiError(500, 'Не вдалось надіслати лист');
    }

    logger.info(`Verification email resent to ${email}`);
    res.json({ message: 'Новий лист надіслано. Перевір пошту.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 *
 * Так само РОЗКРИВАЄ існування email — якщо клієнт не памʼятає на яку
 * адресу реєструвався, краще йому одразу про це сказати.
 */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new ApiError(
        404,
        'Користувача з такою поштою не знайдено. Можливо, ти ще не реєструвалась?',
        { code: 'EMAIL_NOT_FOUND' }
      );
    }

    assertEmailCooldown(user);

    const password_reset_token = generateRandomToken();
    const password_reset_expires = expiresInHours(PASSWORD_RESET_EXPIRES_HOURS);

    await user.update({
      password_reset_token,
      password_reset_expires,
      last_email_sent_at: new Date(),
    });

    try {
      await sendPasswordResetEmail(email, user.name, password_reset_token);
    } catch (emailErr) {
      logger.error(`Failed to send reset email to ${email}: ${emailErr}`);
      throw new ApiError(500, 'Не вдалось надіслати лист');
    }

    logger.info(`Password reset email sent to ${email}`);
    res.json({ message: 'Лист зі скиданням паролю надіслано. Перевір пошту.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
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

    // Перевірка складності
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
