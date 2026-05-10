import { Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { resendVerification } from '../api/auth';

export function CheckEmailPage() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    try {
      await resendVerification(email);
      setResendStatus('Лист для підтвердження електронної пошти успішно надіслано повторно.');
    } catch {
      setResendStatus('Не вдалося надіслати лист повторно. Спробуйте ще раз пізніше.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-primary-900 mb-3">Підтвердження електронної пошти</h1>
        <p className="text-gray-600 mb-2">
          На вказану електронну адресу надіслано лист для підтвердження акаунта:
        </p>
        <p className="font-semibold text-gray-800 mb-6 break-all">{email}</p>
        <p className="text-sm text-gray-500 mb-6">
          Для завершення реєстрації перейдіть за посиланням у листі.
          Якщо лист не відображається у папці «Вхідні», перевірте папку <strong>«Спам»</strong>. Посилання дійсне протягом 24 годин.
        </p>

        <button
          onClick={handleResend}
          disabled={isResending || !email}
          className="text-primary-700 hover:text-primary-900 font-medium underline disabled:opacity-50"
        >
          {isResending ? 'Повторне надсилання...' : 'Надіслати лист повторно'}
        </button>
        {resendStatus && <p className="mt-3 text-xs text-gray-600">{resendStatus}</p>}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link to="/login" className="text-sm text-primary-700 hover:text-primary-900">
            ← На сторінку входу
          </Link>
        </div>
      </div>
    </div>
  );
}
