import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Spinner';

type Status = 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Status>('verifying');
  const [error, setError] = useState<string | null>(null);
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();

  const token = params.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Токен підтвердження відсутній у посиланні.');
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus('success');
        // через 2 секунди редірект на головну
        setTimeout(() => navigate('/', { replace: true }), 2000);
      })
      .catch((err) => {
        setStatus('error');
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.error ?? 'Не вдалось підтвердити email');
        } else {
          setError('Невідома помилка');
        }
      });
  }, [token, verifyEmail, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="flex justify-center mb-4">
              <Spinner size="lg" />
            </div>
            <h1 className="text-xl font-semibold text-gray-800">
              Підтверджуємо email…
            </h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-green-700 mb-3">
              Email підтверджено!
            </h1>
            <p className="text-gray-600">
              Зараз перенаправимо на головну сторінку…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">✗</div>
            <h1 className="text-2xl font-bold text-red-700 mb-3">Помилка</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              to="/login"
              className="inline-block bg-primary-900 text-white px-6 py-2 rounded-lg hover:bg-primary-800 transition"
            >
              На сторінку входу
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
