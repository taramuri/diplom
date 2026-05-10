/**
 * HTML-шаблони листів. Інлайн-стилі — щоб працювало в усіх email-клієнтах.
 */

interface BaseTemplateOptions {
  appName: string;
  preheader?: string;
  bodyHtml: string;
}

/** Спільний layout для всіх листів. */
export function baseTemplate(opts: BaseTemplateOptions): string {
  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${opts.appName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;color:#1a1a1a;">
  ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${opts.preheader}</div>` : ''}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background-color:#5e3c50;padding:24px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:0.5px;">${opts.appName}</h1>
        </td></tr>
        <tr><td style="padding:32px 32px 24px 32px;font-size:15px;line-height:1.6;color:#333333;">
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 32px;background-color:#fafafa;border-top:1px solid #eeeeee;font-size:12px;color:#888888;text-align:center;">
          ${opts.appName} — система виявлення синтетичних зображень<br>
          Цей лист надіслано автоматично, не відповідай на нього.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Кнопка-посилання у листі. */
function actionButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr><td style="background-color:#5e3c50;border-radius:6px;">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>
    </td></tr>
  </table>`;
}

export function verificationEmailHtml(opts: {
  appName: string;
  recipientName: string | null;
  verificationUrl: string;
  expiresHours: number;
}): string {
  const greeting = opts.recipientName ? `Привіт, ${opts.recipientName}!` : 'Вітаємо!';
  return baseTemplate({
    appName: opts.appName,
    preheader: 'Підтвердіть свою email адресу для активації акаунта',
    bodyHtml: `
      <p style="margin:0 0 16px 0;font-size:18px;color:#1a1a1a;"><strong>${greeting}</strong></p>
      <p>Дякуємо за реєстрацію в <strong>${opts.appName}</strong>. Щоб завершити створення акаунта, підтвердь свою email адресу — натисни кнопку:</p>
      ${actionButton(opts.verificationUrl, 'Підтвердити email')}
      <p style="font-size:13px;color:#666666;">Або скопіюй це посилання у браузер:</p>
      <p style="font-size:13px;color:#5e3c50;word-break:break-all;">${opts.verificationUrl}</p>
      <p style="font-size:13px;color:#888888;margin-top:24px;">Посилання дійсне ${opts.expiresHours} годин. Якщо ти не реєструвалась — просто проігноруй цей лист.</p>
    `,
  });
}

export function passwordResetEmailHtml(opts: {
  appName: string;
  recipientName: string | null;
  resetUrl: string;
  expiresHours: number;
}): string {
  const greeting = opts.recipientName ? `Привіт, ${opts.recipientName}!` : 'Вітаємо!';
  return baseTemplate({
    appName: opts.appName,
    preheader: 'Запит на скидання паролю',
    bodyHtml: `
      <p style="margin:0 0 16px 0;font-size:18px;color:#1a1a1a;"><strong>${greeting}</strong></p>
      <p>Ти (або хтось інший) запросила скидання паролю до акаунта в <strong>${opts.appName}</strong>. Щоб встановити новий пароль — натисни кнопку:</p>
      ${actionButton(opts.resetUrl, 'Скинути пароль')}
      <p style="font-size:13px;color:#666666;">Або скопіюй це посилання у браузер:</p>
      <p style="font-size:13px;color:#5e3c50;word-break:break-all;">${opts.resetUrl}</p>
      <p style="font-size:13px;color:#888888;margin-top:24px;">Посилання дійсне ${opts.expiresHours} годину. Якщо ти не запитувала зміну паролю — просто проігноруй цей лист, твій поточний пароль лишиться без змін.</p>
    `,
  });
}
