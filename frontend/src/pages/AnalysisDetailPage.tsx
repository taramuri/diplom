import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { Analysis } from '../types';
import { getAnalysis, loadHeatmap } from '../api/analyze';
import { ImagePreview } from '../components/ImagePreview';
import { Spinner } from '../components/Spinner';
import { formatProbability, formatDate } from '../utils/format';

export function AnalysisDetailPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [heatmapUrl, setHeatmapUrl] = useState<string | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

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
      .then(setAnalysis)
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
    if (!analysis || analysis.status !== 'completed' || !analysis.heatmap_url) {
      return;
    }
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
        <Link to="/history" className="text-primary-700 hover:text-primary-900">
          ← До історії
        </Link>
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
      <Link
        to="/history"
        className="text-sm text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
      >
        ← До історії
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Аналіз #{analysis.id}</h1>
          <p className="text-sm text-gray-500 break-all mt-1">{analysis.filename}</p>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formatDate(analysis.created_at)}
        </span>
      </div>

      {/* Verdict + Probability */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        {analysis.verdict && (
          <div
            className={`inline-block px-4 py-2 rounded-lg border font-semibold mb-4 ${verdictBadgeClass}`}
          >
            {isSynthetic ? '⚠ Синтетичне зображення' : '✓ Реальне зображення'}
          </div>
        )}

        {analysis.probability_synthetic !== null && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Імовірність синтетичності</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isSynthetic ? 'bg-red-500' : 'bg-green-500'
                  }`}
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

      {/* Original + Heatmap side-by-side */}
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
          <h3 className="text-sm font-semibold text-gray-700 mb-1">
            Теплова карта (Grad-CAM)
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Червоні зони — найвпливовіші для рішення моделі
          </p>
          {heatmapLoading && (
            <div className="w-full min-h-[200px] bg-gray-50 rounded flex items-center justify-center">
              <Spinner />
            </div>
          )}
          {heatmapUrl && (
            <img
              src={heatmapUrl}
              alt="Grad-CAM heatmap"
              className="w-full rounded border border-gray-200"
            />
          )}
          {!heatmapLoading && !heatmapUrl && (
            <p className="text-sm text-gray-500">Теплокарта недоступна</p>
          )}
        </div>
      </div>
    </div>
  );
}
