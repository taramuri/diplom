import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';
import {
  verificationEmailHtml,
  passwordResetEmailHtml,
} from './emailTemplates';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'SynthDetect <noreply@synthdetect.local>';
const APP_NAME = process.env.APP_NAME || 'SynthDetect';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

const VERIFICATION_EXPIRES_HOURS = 24;
const PASSWORD_RESET_EXPIRES_HOURS = 1;

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP не налаштовано. Заповни SMTP_HOST, SMTP_USER, SMTP_PASS у .env'
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // SSL якщо 465; STARTTLS якщо 587
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

/**
 * Відправляє лист з підтвердженням email.
 */
export async function sendVerificationEmail(
  email: string,
  recipientName: string | null,
  token: string
): Promise<void> {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
  const html = verificationEmailHtml({
    appName: APP_NAME,
    recipientName,
    verificationUrl,
    expiresHours: VERIFICATION_EXPIRES_HOURS,
  });

  try {
    const info = await getTransporter().sendMail({
      from: SMTP_FROM,
      to: email,
      subject: `[${APP_NAME}] Підтвердження реєстрації`,
      html,
      text: `Підтвердь свою email адресу: ${verificationUrl}`,
    });
    logger.info(`Verification email sent to ${email} (id: ${info.messageId})`);
  } catch (err) {
    logger.error(`Failed to send verification email to ${email}: ${err}`);
    throw err;
  }
}

/**
 * Відправляє лист зі скиданням паролю.
 */
export async function sendPasswordResetEmail(
  email: string,
  recipientName: string | null,
  token: string
): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
  const html = passwordResetEmailHtml({
    appName: APP_NAME,
    recipientName,
    resetUrl,
    expiresHours: PASSWORD_RESET_EXPIRES_HOURS,
  });

  try {
    const info = await getTransporter().sendMail({
      from: SMTP_FROM,
      to: email,
      subject: `[${APP_NAME}] Скидання паролю`,
      html,
      text: `Скинь пароль за посиланням: ${resetUrl}`,
    });
    logger.info(`Password reset email sent to ${email} (id: ${info.messageId})`);
  } catch (err) {
    logger.error(`Failed to send password reset email to ${email}: ${err}`);
    throw err;
  }
}

/**
 * Перевіряє з'єднання зі SMTP при старті.
 * Викликається з main.ts (опційно).
 */
export async function verifySmtpConnection(): Promise<boolean> {
  if (!SMTP_HOST) {
    logger.warn('SMTP не налаштовано (SMTP_HOST порожній). Email-фічі не працюватимуть.');
    return false;
  }
  try {
    await getTransporter().verify();
    logger.info(`✓ SMTP з'єднання з ${SMTP_HOST}:${SMTP_PORT} OK`);
    return true;
  } catch (err) {
    logger.error(`✗ SMTP помилка: ${err}`);
    return false;
  }
}
