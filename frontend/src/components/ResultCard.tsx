import { useEffect, useState } from 'react';
import { Analysis } from '../types';
import { loadHeatmap } from '../api/analyze';
import { Spinner } from './Spinner';
import { formatProbability, formatDate } from '../utils/format';

interface ResultCardProps {
  analysis: Analysis;
}

export function ResultCard({ analysis }: ResultCardProps) {
  const [heatmapUrl, setHeatmapUrl] = useState<string | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  useEffect(() => {
    let revokedUrl: string | null = null;

    if (analysis.status === 'completed' && analysis.heatmap_url) {
      setHeatmapLoading(true);
      loadHeatmap(analysis.id)
        .then((url) => {
          revokedUrl = url;
          setHeatmapUrl(url);
        })
        .catch((err) => console.error('Failed to load heatmap:', err))
        .finally(() => setHeatmapLoading(false));
    }

    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [analysis.id, analysis.status, analysis.heatmap_url]);

  const isSynthetic = analysis.verdict === 'synthetic';
  const verdictBadgeClass = isSynthetic
    ? 'bg-red-100 text-red-800 border-red-300'
    : 'bg-green-100 text-green-800 border-green-300';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Результати аналізу</h3>
        <span className="text-xs text-gray-500">{formatDate(analysis.created_at)}</span>
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">Назва файлу</p>
        <p className="font-medium text-gray-800 break-all">{analysis.filename}</p>
      </div>

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

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
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
      </div>

      {analysis.cached && (
        <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded mb-4">
          ⚡ Результат з кешу — це зображення вже аналізувалось
        </p>
      )}

      <div className="mt-4">
        <p className="text-sm font-semibold text-gray-700 mb-1">
          Теплова карта (Grad-CAM)
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Червоні зони позначають ділянки, які найбільше вплинули на результат аналізу
        </p>
        {heatmapLoading && (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
            <Spinner />
          </div>
        )}
        {heatmapUrl && (
          <img
            src={heatmapUrl}
            alt="Grad-CAM heatmap"
            className="w-full max-w-md rounded border border-gray-200"
          />
        )}
      </div>
    </div>
  );
}
