/**
 * API клиент для взаимодействия с Django backend
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Создаем экземпляр axios с базовой конфигурацией
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена авторизации
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если токен истек, пытаемся обновить его
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Если не удалось обновить токен, перенаправляем на страницу входа
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Улучшенная обработка ошибок для лучшей отладки
    if (error.response) {
      // Сервер ответил с ошибкой
      const errorData = error.response.data;
      const errorMessage = errorData?.message || errorData?.error || errorData?.detail || error.message;
      
      // Логируем ошибку для отладки
      console.error('API Error:', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        status: error.response.status,
        data: errorData,
        message: errorMessage,
      });
      
      // Создаем улучшенный объект ошибки
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).response = error.response;
      (enhancedError as any).status = error.response.status;
      (enhancedError as any).data = errorData;
      return Promise.reject(enhancedError);
    } else if (error.request) {
      // Запрос был отправлен, но ответа не получено
      console.error('Network Error:', error.request);
      const networkError = new Error('Нет соединения с сервером. Проверьте подключение к интернету.');
      (networkError as any).isNetworkError = true;
      return Promise.reject(networkError);
    } else {
      // Что-то другое пошло не так
      console.error('Request Error:', error.message);
      return Promise.reject(error);
    }
  }
);

export default apiClient;

