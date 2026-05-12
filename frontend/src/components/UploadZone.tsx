import { useState, useRef, DragEvent } from 'react';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isDisabled?: boolean;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

export function UploadZone({ onUpload, isDisabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = (file: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Непідтримуваний формат: ${file.type}. Дозволено JPEG, PNG, WebP.`);
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Розмір файлу перевищує допустимий ліміт (${MAX_SIZE_MB} МБ).`);
      return;
    }
    onUpload(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isDisabled) return;
    const file = e.dataTransfer.files[0];
    if (file) validateAndUpload(file);
  };

  const handleClick = () => {
    if (!isDisabled) inputRef.current?.click();
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={[
          'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 bg-white',
          isDisabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-primary-400 hover:bg-primary-50',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndUpload(file);
          }}
          disabled={isDisabled}
        />
        <svg
          className="w-12 h-12 mx-auto text-gray-400 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-lg font-medium text-gray-700">
          Завантажте зображення для аналізу
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Перетягніть файл у цю область або натисніть для вибору
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Підтримувані формати: JPEG, PNG, WebP. Максимальний розмір файлу - {MAX_SIZE_MB} МБ
        </p>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
