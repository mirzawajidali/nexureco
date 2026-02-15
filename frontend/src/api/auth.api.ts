import apiClient from './client';
import type { TokenResponse, RegisterData, LoginData, User } from '@/types/user';
import type { MessageResponse } from '@/types/common';

export const authApi = {
  register: (data: RegisterData) =>
    apiClient.post<TokenResponse>('/auth/register', data),

  login: (data: LoginData) =>
    apiClient.post<TokenResponse>('/auth/login', data),

  refresh: (refreshToken: string) =>
    apiClient.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken }),

  logout: (refreshToken: string) =>
    apiClient.post<MessageResponse>('/auth/logout', { refresh_token: refreshToken }),

  forgotPassword: (email: string) =>
    apiClient.post<MessageResponse>('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post<MessageResponse>('/auth/reset-password', {
      token,
      new_password: newPassword,
    }),

  getMe: () =>
    apiClient.get<User>('/auth/me'),
};
