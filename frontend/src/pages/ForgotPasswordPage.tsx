import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { forgotPassword } from '../api/auth';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    setIsSubmitting(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        setError(data?.error ?? 'Помилка');
        setErrorCode(data?.details?.code ?? data?.code ?? null);
      } else {
        setError('Невідома помилка');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-primary-900 mb-2">Забув пароль?</h1>
        <p className="text-gray-600 mb-6">
          Введи email — ми надішлемо посилання для скидання паролю.
        </p>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 px-4 py-4 rounded text-sm text-green-800">
            <p className="font-medium mb-1">✓ Лист надіслано</p>
            <p className="text-green-700">
              Перевір пошту — клікни посилання у листі для скидання паролю. Посилання
              дійсне 1 годину.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block text-primary-700 hover:text-primary-900 font-medium"
            >
              ← На сторінку входу
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  autoComplete="email"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  <p>{error}</p>
                  {errorCode === 'EMAIL_NOT_FOUND' && (
                    <p className="mt-2 text-xs">
                      <Link
                        to="/register"
                        className="text-primary-700 hover:text-primary-900 font-medium underline"
                      >
                        Зареєструватись →
                      </Link>
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary-900 text-white py-2 rounded-lg hover:bg-primary-800 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Відправляю…' : 'Надіслати посилання'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              <Link to="/login" className="text-primary-700 hover:text-primary-900">
                ← На сторінку входу
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
