import { Link } from 'react-router-dom';
import { Analysis } from '../types';
import { formatProbability, formatDate } from '../utils/format';

interface HistoryListProps {
  items: Analysis[];
}

export function HistoryList({ items }: HistoryListProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-500 mb-3">Поки що жодного аналізу.</p>
        <Link
          to="/"
          className="text-primary-700 hover:text-primary-900 font-medium"
        >
          Завантажити перше зображення →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Файл
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Вердикт
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Імовірність
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Час
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Дата
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-medium text-gray-800 truncate max-w-xs">
                  {a.filename}
                </td>
                <td className="px-6 py-3">
                  {a.verdict === 'synthetic' && (
                    <span className="inline-block px-2 py-1 text-xs rounded bg-red-100 text-red-800">
                      Синтетичне
                    </span>
                  )}
                  {a.verdict === 'real' && (
                    <span className="inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                      Реальне
                    </span>
                  )}
                  {a.status === 'pending' && (
                    <span className="text-xs text-gray-500">Обробка…</span>
                  )}
                  {a.status === 'failed' && (
                    <span className="text-xs text-red-600">Помилка</span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm font-mono">
                  {a.probability_synthetic !== null
                    ? formatProbability(a.probability_synthetic)
                    : '—'}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {a.processing_time_ms !== null ? `${a.processing_time_ms} мс` : '—'}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {formatDate(a.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
