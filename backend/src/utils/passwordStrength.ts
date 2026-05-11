/**
 * Перевірка складності пароля.
 * Цей файл дублюється на frontend (src/utils/passwordStrength.ts) — синхронізуй обидва.
 */

const COMMON_PASSWORDS = new Set([
  '123456', 'password', '12345678', 'qwerty', '12345', '123456789',
  'letmein', '1234567', 'football', 'iloveyou', 'admin', 'welcome',
  'monkey', 'login', 'abc123', 'starwars', '123123', 'dragon',
  'passw0rd', 'master', 'hello', 'freedom', 'whatever', 'qazwsx',
  'trustno1', 'qwerty123', 'password1', 'qwertyuiop', 'asdfgh',
  'zaq12wsx', '1q2w3e4r', 'admin123', 'root', 'guest', 'test',
  'testtest', 'password123', 'qwerty12', 'asdfasdf', 'aaaaaa', '111111',
  'ukraine', 'kyiv', 'kiev', 'lviv', 'odessa', 'kharkiv', 'donetsk',
]);

export type PasswordScore = 'weak' | 'medium' | 'strong';

export interface PasswordCheckResult {
  score: PasswordScore;
  isValid: boolean;
  issues: string[];
}

export interface PasswordUserInfo {
  email?: string;
  name?: string | null;
}

/**
 * Перевіряє пароль на складність.
 *
 * Hard requirements (без них пароль НЕ ВАЛІДНИЙ):
 * - мінімум 8 символів
 * - велика літера (A-Z)
 * - мала літера (a-z)
 * - цифра (0-9)
 * - не у списку поширених
 * - не містить email/імʼя
 *
 * Soft scoring (тільки якщо валідний):
 * - 8-11 символів → medium
 * - 12+ символів → strong
 */
export function checkPasswordStrength(
  password: string,
  userInfo?: PasswordUserInfo
): PasswordCheckResult {
  const issues: string[] = [];

  if (password.length < 8) {
    issues.push('Мінімум 8 символів');
  }
  if (!/[A-Z]/.test(password)) {
    issues.push('Має містити велику літеру (A-Z)');
  }
  if (!/[a-z]/.test(password)) {
    issues.push('Має містити малу літеру (a-z)');
  }
  if (!/[0-9]/.test(password)) {
    issues.push('Має містити цифру (0-9)');
  }

  const lower = password.toLowerCase();

  if (COMMON_PASSWORDS.has(lower)) {
    issues.push('Це поширений пароль — не використовуй');
  }

  if (/^(.)\1+$/.test(password)) {
    issues.push('Не використовуй однаковий символ повторно');
  }

  // Послідовності цифр / літер
  if (/^(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef)/i.test(password)) {
    issues.push('Не використовуй прості послідовності');
  }

  if (userInfo?.email) {
    const emailPrefix = userInfo.email.split('@')[0].toLowerCase();
    if (emailPrefix.length >= 4 && lower.includes(emailPrefix)) {
      issues.push('Не використовуй частину email у паролі');
    }
  }

  if (userInfo?.name) {
    const nameLower = userInfo.name.toLowerCase().trim();
    if (nameLower.length >= 3 && lower.includes(nameLower)) {
      issues.push('Не використовуй імʼя у паролі');
    }
  }

  const isValid = issues.length === 0;
  let score: PasswordScore = 'weak';
  if (isValid) {
    score = password.length >= 12 ? 'strong' : 'medium';
  }

  return { score, isValid, issues };
}
