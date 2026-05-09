import { useState } from 'react';
import axios from 'axios';
import { UploadZone } from '../components/UploadZone';
import { ResultCard } from '../components/ResultCard';
import { Spinner } from '../components/Spinner';
import { analyzeImage } from '../api/analyze';
import { Analysis } from '../types';

export function DashboardPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setError(null);
    setResult(null);
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeImage(file);
      setResult(analysis);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Помилка аналізу');
      } else {
        setError('Невідома помилка');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Аналіз зображень</h1>
        <p className="text-gray-600">
          Завантажте зображення для перевірки на синтетичну природу
          (Stable Diffusion, DALL-E, Midjourney, GAN тощо).
        </p>
      </div>

      <UploadZone onUpload={handleUpload} isDisabled={isAnalyzing} />

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {isAnalyzing && (
        <div className="mt-8 bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="flex justify-center mb-4">
            <Spinner size="lg" />
          </div>
          <p className="text-gray-600">Аналіз зображення…</p>
          <p className="text-sm text-gray-500 mt-1">
            Передача на ML-сервіс і генерація теплокарти
          </p>
        </div>
      )}

      {result && (
        <div className="mt-8">
          <ResultCard analysis={result} />
        </div>
      )}
    </div>
  );
}
