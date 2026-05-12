import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Analysis, HistoryResponse } from '../types';
import { apiClient } from '../api/client';
import { HistoryList } from '../components/HistoryList';
import { Spinner } from '../components/Spinner';

export function HistoryPage() {
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setError(null);
    try {
      const { data } = await apiClient.get<HistoryResponse>('/history?page=1&limit=50');
      setItems(data.items);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Помилка завантаження історії');
      } else {
        setError('Невідома помилка');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Історія аналізів</h1>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {!loading && !error && <HistoryList items={items} onReload={fetchHistory} />}
    </div>
  );
}
