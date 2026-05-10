import { apiClient } from './client';
import { AuthResponse, RegisterResponse, User } from '../types';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function register(
  email: string,
  password: string,
  name?: string
): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/auth/register', {
    email,
    password,
    name,
  });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<{ user: User }>('/auth/me');
  return data.user;
}

export async function verifyEmail(token: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse & { message: string }>(
    '/auth/verify-email',
    { token }
  );
  return data;
}

export async function resendVerification(email: string): Promise<void> {
  await apiClient.post('/auth/resend-verification', { email });
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  await apiClient.post('/auth/reset-password', {
    token,
    new_password: newPassword,
  });
}
