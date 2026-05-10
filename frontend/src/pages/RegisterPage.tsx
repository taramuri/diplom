import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(email, password, name || undefined);
      navigate(`/check-email?email=${encodeURIComponent(email)}`, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const details = err.response?.data?.details;
        if (Array.isArray(details)) {
          setError(details.join('; '));
        } else {
          setError(err.response?.data?.error ?? 'Помилка реєстрації');
        }
      } else {
        setError('Невідома помилка');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">SynthDetect</h1>
        <p className="text-gray-600 mb-6">Реєстрація нового акаунта</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Імʼя <span className="text-gray-400 text-xs">(не обовʼязково)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Тетяна"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="user@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
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
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-900 text-white py-2 rounded-lg hover:bg-primary-800 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Створення…' : 'Створити акаунт'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Вже маєте акаунт?{' '}
          <Link to="/login" className="text-primary-700 hover:text-primary-900 font-medium">
            Увійти
          </Link>
        </p>
      </div>
    </div>
  );
}
