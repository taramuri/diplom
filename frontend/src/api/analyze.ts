import { apiClient } from './client';
import { Analysis } from '../types';

export async function analyzeImage(file: File): Promise<Analysis> {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await apiClient.post<Analysis>('/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getAnalysis(id: number): Promise<Analysis> {
  const { data } = await apiClient.get<Analysis>(`/analyze/${id}`);
  return data;
}

/**
 * Переназиває запис аналізу (тільки display-назву).
 */
export async function renameAnalysis(id: number, filename: string): Promise<Analysis> {
  const { data } = await apiClient.patch<Analysis>(`/analyze/${id}`, { filename });
  return data;
}

/**
 * Видаляє запис аналізу + файли з диску.
 */
export async function deleteAnalysis(id: number): Promise<void> {
  await apiClient.delete(`/analyze/${id}`);
}

export async function loadImage(analysisId: number): Promise<string> {
  const response = await apiClient.get(`/analyze/${analysisId}/image`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data);
}

export async function loadHeatmap(analysisId: number): Promise<string> {
  const response = await apiClient.get(`/analyze/${analysisId}/heatmap`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data);
}
