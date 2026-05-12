import { useState, KeyboardEvent, MouseEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Analysis } from '../types';
import { ImagePreview } from './ImagePreview';
import { PencilIcon, TrashIcon, CheckIcon, XIcon } from './Icons';
import { renameAnalysis, deleteAnalysis } from '../api/analyze';
import { formatProbability, formatDate } from '../utils/format';

interface HistoryListProps {
  items: Analysis[];
  onReload: () => void;
}

export function HistoryList({ items, onReload }: HistoryListProps) {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-500 mb-3">Поки що жодного аналізу.</p>
        <Link to="/" className="text-primary-700 hover:text-primary-900 font-medium">
          Завантажити зображення →
        </Link>
      </div>
    );
  }

  const startRename = (a: Analysis, e: MouseEvent) => {
    e.stopPropagation();
    setEditingId(a.id);
    setEditValue(a.filename);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveRename = async (id: number) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      cancelRename();
      return;
    }
    setBusy(id);
    try {
      await renameAnalysis(id, trimmed);
      cancelRename();
      onReload();
    } catch (err) {
      console.error('Rename failed', err);
      cancelRename();
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (a: Analysis, e: MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Видалити аналіз «${a.filename}»? Цю дію не можна скасувати.`)) {
      return;
    }
    setBusy(a.id);
    try {
      await deleteAnalysis(a.id);
      onReload();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Не вдалося видалити аналіз. Повторіть спробу.');
    } finally {
      setBusy(null);
    }
  };

  const handleRowClick = (a: Analysis) => {
    if (editingId === a.id || busy === a.id) return;
    navigate(`/analysis/${a.id}`);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, id: number) => {
    e.stopPropagation();
    if (e.key === 'Enter') saveRename(id);
    if (e.key === 'Escape') cancelRename();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">Превʼю</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Назва файлу</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Вердикт</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Імовірність</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Час обробки</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((a) => {
              const isEditing = editingId === a.id;
              const isBusy = busy === a.id;
              return (
                <tr
                  key={a.id}
                  onClick={() => handleRowClick(a)}
                  className={`transition-colors ${
                    isEditing || isBusy
                      ? 'bg-amber-50'
                      : 'hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  <td className="px-4 py-3">
                    <ImagePreview
                      analysisId={a.id}
                      className="h-12 w-12 rounded object-cover border border-gray-200"
                      alt={a.filename}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => handleKeyDown(e, a.id)}
                        onBlur={() => saveRename(a.id)}
                        maxLength={200}
                        autoFocus
                        className="w-full px-2 py-1 border border-primary-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    ) : (
                      <span className="font-medium text-gray-800 truncate block max-w-xs">
                        {a.filename}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
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
                    {a.status === 'pending' && <span className="text-xs text-gray-500">Обробка…</span>}
                    {a.status === 'failed' && <span className="text-xs text-red-600">Помилка</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {a.probability_synthetic !== null
                      ? formatProbability(a.probability_synthetic)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {a.processing_time_ms !== null ? `${a.processing_time_ms} мс` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {formatDate(a.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveRename(a.id);
                          }}
                          className="p-1 text-green-700 hover:bg-green-100 rounded"
                          title="Зберегти"
                          disabled={isBusy}
                        >
                          <CheckIcon size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelRename();
                          }}
                          className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                          title="Скасувати"
                        >
                          <XIcon size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={(e) => startRename(a, e)}
                          className="p-1 text-gray-500 hover:text-primary-700 hover:bg-gray-100 rounded"
                          title="Змінити назву"
                          disabled={isBusy}
                        >
                          <PencilIcon size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(a, e)}
                          className="p-1 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Видалити"
                          disabled={isBusy}
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
