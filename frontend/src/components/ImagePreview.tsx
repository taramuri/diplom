import { useEffect, useState } from 'react';
import { loadImage } from '../api/analyze';

interface ImagePreviewProps {
  analysisId: number;
  className?: string;
  alt?: string;
}

/**
 * Завантажує оригінал зображення з аналізу через blob (з auth-токеном).
 * Показує сіру плашку поки вантажиться, "?" якщо помилка.
 */
export function ImagePreview({
  analysisId,
  className = '',
  alt = 'Image',
}: ImagePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    setLoading(true);
    setError(false);
    loadImage(analysisId)
      .then((u) => {
        revoked = u;
        setUrl(u);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [analysisId]);

  if (loading) {
    return <div className={`${className} bg-gray-100 animate-pulse`} />;
  }

  if (error || !url) {
    return (
      <div
        className={`${className} bg-gray-200 flex items-center justify-center`}
      >
        <span className="text-gray-400 text-xs">?</span>
      </div>
    );
  }

  return <img src={url} alt={alt} className={className} />;
}
