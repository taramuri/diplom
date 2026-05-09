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
 * Завантажує теплокарту як blob і повертає object URL,
 * який можна використати у <img src="...">.
 * Auth header додається автоматично через interceptor.
 */
export async function loadHeatmap(analysisId: number): Promise<string> {
  const response = await apiClient.get(`/analyze/${analysisId}/heatmap`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data);
}
