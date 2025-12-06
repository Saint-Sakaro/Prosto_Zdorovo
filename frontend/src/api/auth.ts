/**
 * API методы для авторизации и регистрации
 */

import apiClient from './client';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  tokens: {
    access: string;
    refresh: string;
  };
  message?: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
  last_login: string | null;
}

export const authApi = {
  // Регистрация
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register/', data);
    return response.data;
  },

  // Вход в систему
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login/', data);
    return response.data;
  },

  // Обновление токена
  refreshToken: async (refreshToken: string): Promise<{ access: string }> => {
    const response = await apiClient.post('/auth/token/refresh/', {
      refresh: refreshToken,
    });
    return response.data;
  },

  // Получение профиля текущего пользователя
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get('/auth/profile/');
    return response.data;
  },

  // Обновление профиля
  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await apiClient.put('/auth/profile/', data);
    return response.data;
  },

  // Получение информации о текущем пользователе (с данными геймификации)
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me/');
    return response.data;
  },

  // Смена пароля
  changePassword: async (data: {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/change-password/', data);
    return response.data;
  },
};

