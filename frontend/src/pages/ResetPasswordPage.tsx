import { useState, FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { resetPassword } from '../api/auth';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { checkPasswordStrength } from '../utils/passwordStrength';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }

    const strength = checkPasswordStrength(password);
    if (!strength.isValid) {
      setError('Виправ помилки в паролі: ' + strength.issues.join('; '));
      return;
    }

    if (!token) {
      setError('Токен скидання відсутній у посиланні');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        if (data?.details?.issues && Array.isArray(data.details.issues)) {
          setError('Пароль: ' + data.details.issues.join('; '));
        } else {
          setError(data?.error ?? 'Помилка скидання паролю');
        }
      } else {
        setError('Невідома помилка');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-green-700 mb-3">Пароль змінено!</h1>
          <p className="text-gray-600">Перенаправимо на сторінку входу…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-primary-900 mb-2">Новий пароль</h1>
        <p className="text-gray-600 mb-6">Встанови новий пароль для свого акаунта.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Новий пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="мінімум 8 символів"
              autoComplete="new-password"
            />
            <PasswordStrengthMeter password={password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Повтори пароль
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              autoComplete="new-password"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-600 mt-1">Паролі не співпадають</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="w-full bg-primary-900 text-white py-2 rounded-lg hover:bg-primary-800 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Зміна…' : 'Змінити пароль'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          <Link to="/login" className="text-primary-700 hover:text-primary-900">
            ← На сторінку входу
          </Link>
        </p>
      </div>
    </div>
  );
}
