import { apiClient } from './client';
import { HistoryResponse } from '../types';

export async function getHistory(page = 1, limit = 20): Promise<HistoryResponse> {
  const { data } = await apiClient.get<HistoryResponse>('/history', {
    params: { page, limit },
  });
  return data;
}
