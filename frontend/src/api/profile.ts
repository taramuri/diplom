import { apiClient } from './client';
import { User } from '../types';

export async function updateProfile(
  updates: { name?: string | null; email?: string }
): Promise<User> {
  const { data } = await apiClient.patch<{ user: User }>('/auth/me', updates);
  return data.user;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiClient.post('/auth/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function uploadAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append('avatar', file);

  const { data } = await apiClient.post<{ user: User }>('/auth/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.user;
}

export async function deleteAvatar(): Promise<User> {
  const { data } = await apiClient.delete<{ user: User }>('/auth/me/avatar');
  return data.user;
}

export async function loadAvatar(): Promise<string> {
  const response = await apiClient.get('/auth/me/avatar', { responseType: 'blob' });
  return URL.createObjectURL(response.data);
}
