import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">Сторінку не знайдено</p>
        <Link
          to="/"
          className="inline-block bg-primary-900 text-white px-6 py-2 rounded-lg hover:bg-primary-800 transition"
        >
          На головну
        </Link>
      </div>
    </div>
  );
}
