import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_TIMEOUT_MS = 60_000;

export interface ClassifyResult {
  verdict: 'real' | 'synthetic';
  probability_synthetic: number;
  model_version: string;
  processing_time_ms: number;
  heatmap_png_base64: string;
}

export interface MLHealth {
  status: 'ok' | 'degraded';
  model_loaded: boolean;
  model_version: string;
  device: string;
}

/**
 * Викликає ML-сервіс для класифікації одного зображення.
 * Передає файл як multipart/form-data.
 */
export async function classifyImage(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<ClassifyResult> {
  const formData = new FormData();
  formData.append('file', buffer, { filename, contentType: mimetype });

  try {
    const response = await axios.post<ClassifyResult>(
      `${ML_SERVICE_URL}/classify`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: ML_TIMEOUT_MS,
      }
    );
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      logger.error(
        `ML service error: status=${axiosErr.response?.status} ` +
          `msg=${axiosErr.message} detail=${axiosErr.response?.data?.detail}`
      );
      if (axiosErr.response?.status === 503) {
        throw new ApiError(
          503,
          'ML service is not ready: model is not loaded'
        );
      }
      if (axiosErr.code === 'ECONNREFUSED') {
        throw new ApiError(
          503,
          `ML service is not reachable at ${ML_SERVICE_URL}`
        );
      }
      throw new ApiError(
        502,
        'ML service failed',
        axiosErr.response?.data?.detail
      );
    }
    throw err;
  }
}

export async function checkMLHealth(): Promise<MLHealth | null> {
  try {
    const res = await axios.get<MLHealth>(`${ML_SERVICE_URL}/health`, {
      timeout: 3000,
    });
    return res.data;
  } catch {
    return null;
  }
}
