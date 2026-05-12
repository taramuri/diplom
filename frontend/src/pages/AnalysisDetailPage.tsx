import { useEffect, useState, KeyboardEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Analysis } from '../types';
import {
  getAnalysis,
  loadHeatmap,
  renameAnalysis,
  deleteAnalysis,
} from '../api/analyze';
import { ImagePreview } from '../components/ImagePreview';
import { Spinner } from '../components/Spinner';
import { PencilIcon, TrashIcon, CheckIcon, XIcon } from '../components/Icons';
import { formatProbability, formatDate } from '../utils/format';

export function AnalysisDetailPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [heatmapUrl, setHeatmapUrl] = useState<string | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  // Rename state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!idParam) {
      setError('Невірний ID');
      setLoading(false);
      return;
    }
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      setError('Невірний ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    getAnalysis(id)
      .then((a) => {
        setAnalysis(a);
        setEditedName(a.filename);
      })
      .catch((err) => {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 404) setError('Аналіз не знайдено');
          else if (err.response?.status === 403) setError('Немає доступу');
          else setError('Помилка завантаження');
        } else {
          setError('Невідома помилка');
        }
      })
      .finally(() => setLoading(false));
  }, [idParam]);

  useEffect(() => {
    if (!analysis || analysis.status !== 'completed' || !analysis.heatmap_url) return;
    let revoked: string | null = null;
    setHeatmapLoading(true);
    loadHeatmap(analysis.id)
      .then((u) => {
        revoked = u;
        setHeatmapUrl(u);
      })
      .catch(() => setHeatmapUrl(null))
      .finally(() => setHeatmapLoading(false));
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [analysis]);

  const handleSaveName = async () => {
    if (!analysis) return;
    const trimmed = editedName.trim();
    if (!trimmed || trimmed === analysis.filename) {
      setEditedName(analysis.filename);
      setIsEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const updated = await renameAnalysis(analysis.id, trimmed);
      setAnalysis(updated);
      setIsEditingName(false);
    } catch (err) {
      console.error('Rename failed', err);
      setEditedName(analysis.filename);
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelName = () => {
    if (!analysis) return;
    setEditedName(analysis.filename);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') handleCancelName();
  };

  const handleDelete = async () => {
    if (!analysis) return;
    if (!window.confirm(`Видалити аналіз «${analysis.filename}»? Цю дію не можна скасувати.`)) {
      return;
    }
    setDeleting(true);
    try {
      await deleteAnalysis(analysis.id);
      navigate('/history', { replace: true });
    } catch (err) {
      console.error('Delete failed', err);
      alert('Не вдалось видалити аналіз. Повторіть спробу.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 text-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 text-center">
        <p className="text-red-700 mb-4">{error}</p>
        <Link to="/history" className="text-primary-700 hover:text-primary-900">← До історії</Link>
      </div>
    );
  }

  if (!analysis) return null;

  const isSynthetic = analysis.verdict === 'synthetic';
  const verdictBadgeClass = isSynthetic
    ? 'bg-red-100 text-red-800 border-red-300'
    : 'bg-green-100 text-green-800 border-green-300';

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link to="/history" className="text-sm text-primary-700 hover:text-primary-900 inline-flex items-center gap-1">
        ← До історії
      </Link>

      <div className="flex items-start justify-between gap-4 mt-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Аналіз #{analysis.id}</h1>
          <div className="mt-2 flex items-center gap-2">
            {isEditingName ? (
              <>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  onBlur={handleSaveName}
                  maxLength={200}
                  autoFocus
                  disabled={savingName}
                  className="flex-1 px-3 py-1.5 border border-primary-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="p-1.5 text-green-700 hover:bg-green-100 rounded"
                  title="Зберегти"
                >
                  <CheckIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleCancelName}
                  className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"
                  title="Скасувати"
                >
                  <XIcon size={16} />
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 break-all">{analysis.filename}</p>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="p-1 text-gray-400 hover:text-primary-700 hover:bg-gray-100 rounded"
                  title="Змінити назву"
                >
                  <PencilIcon size={14} />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-start gap-3 flex-shrink-0">
          <span className="text-xs text-gray-500 whitespace-nowrap pt-2">
            {formatDate(analysis.created_at)}
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 text-sm text-red-700 border border-red-300 rounded hover:bg-red-50 transition-colors flex items-center gap-1 disabled:opacity-50"
            title="Видалити аналіз"
          >
            <TrashIcon size={14} />
            <span>Видалити</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        {analysis.verdict && (
          <div className={`inline-block px-4 py-2 rounded-lg border font-semibold mb-4 ${verdictBadgeClass}`}>
            {isSynthetic ? '⚠ Синтетичне зображення' : '✓ Реальне зображення'}
          </div>
        )}

        {analysis.probability_synthetic !== null && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Імовірність синтетичності</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all ${isSynthetic ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${analysis.probability_synthetic * 100}%` }}
                />
              </div>
              <span className="font-mono text-sm font-semibold w-16 text-right">
                {formatProbability(analysis.probability_synthetic)}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Статус</p>
            <p className="font-medium">{analysis.status}</p>
          </div>
          {analysis.model_version && (
            <div>
              <p className="text-gray-500 text-xs">Модель</p>
              <p className="font-medium">{analysis.model_version}</p>
            </div>
          )}
          {analysis.processing_time_ms !== null && (
            <div>
              <p className="text-gray-500 text-xs">Час обробки</p>
              <p className="font-medium">{analysis.processing_time_ms} мс</p>
            </div>
          )}
          <div>
            <p className="text-gray-500 text-xs">ID</p>
            <p className="font-medium">#{analysis.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Оригінал</h3>
          <ImagePreview
            analysisId={analysis.id}
            className="w-full rounded border border-gray-200"
            alt={analysis.filename}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Теплова карта (Grad-CAM)</h3>
          <p className="text-xs text-gray-500 mb-3">
            Червоні зони — найвпливовіші для рішення моделі
          </p>
          {heatmapLoading && (
            <div className="w-full min-h-[200px] bg-gray-50 rounded flex items-center justify-center">
              <Spinner />
            </div>
          )}
          {heatmapUrl && (
            <img src={heatmapUrl} alt="Grad-CAM heatmap" className="w-full rounded border border-gray-200" />
          )}
          {!heatmapLoading && !heatmapUrl && (
            <p className="text-sm text-gray-500">Теплокарта недоступна</p>
          )}
        </div>
      </div>
    </div>
  );
}
