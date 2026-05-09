import { useEffect, useState } from 'react';
import { HistoryList } from '../components/HistoryList';
import { Spinner } from '../components/Spinner';
import { getHistory } from '../api/history';
import { HistoryResponse } from '../types';

export function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setIsLoading(true);
    getHistory(page, 20)
      .then(setData)
      .finally(() => setIsLoading(false));
  }, [page]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Історія аналізів</h1>
      <p className="text-gray-600 mb-6">
        {data ? `Всього: ${data.pagination.total}` : '—'}
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : data ? (
        <>
          <HistoryList items={data.items} />

          {data.pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
              >
                ← Назад
              </button>
              <span className="text-gray-600 text-sm">
                Сторінка {data.pagination.page} з {data.pagination.total_pages}
              </span>
              <button
                disabled={page >= data.pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
              >
                Далі →
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
