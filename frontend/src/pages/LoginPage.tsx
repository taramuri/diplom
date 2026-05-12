import { useState, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { resendVerification } from '../api/auth';
import { PasswordInput } from '../components/PasswordInput';

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendStatus(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
          setNeedsVerification(true);
          setError('Адресу електронної пошти ще не підтверджено. Перевірте пошту або надішліть лист повторно.');
        } else {
          setError(err.response?.data?.error ?? 'Помилка входу');
        }
      } else {
        setError('Невідома помилка');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResendStatus(null);
    try {
      await resendVerification(email);
      setResendStatus('Лист із підтвердженням надіслано. Перевірте електронну пошту, включно з папкою «Спам».');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setResendStatus(err.response?.data?.error ?? 'Не вдалось надіслати');
      } else {
        setResendStatus('Не вдалось надіслати');
      }
    }
  };

  const inputClass =
    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">SynthDetect</h1>
        <p className="text-gray-600 mb-6">Вхід до системи виявлення синтетичних зображень</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
              placeholder="user@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className={inputClass}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>
          )}

          {needsVerification && (
            <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded text-sm">
              <button
                type="button"
                onClick={handleResend}
                className="text-primary-700 hover:text-primary-900 font-medium underline"
              >
                Надіслати лист підтвердження повторно
              </button>
              {resendStatus && <p className="mt-2 text-xs text-gray-600">{resendStatus}</p>}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-900 text-white py-2 rounded-lg hover:bg-primary-800 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Вхід…' : 'Увійти'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600 mt-6 space-y-2">
          <p>
            <Link to="/forgot-password" className="text-primary-700 hover:text-primary-900">
              Забув пароль?
            </Link>
          </p>
          <p>
            Ще не зареєстровані?{' '}
            <Link to="/register" className="text-primary-700 hover:text-primary-900 font-medium">
              Створити обліковий запис
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
