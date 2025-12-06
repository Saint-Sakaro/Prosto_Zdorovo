import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, AuthResponse, UserProfile } from '../api/auth';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Проверка токена при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData.user || userData);
        } catch (error) {
          // Токен невалиден, удаляем его
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    // Сначала очищаем старое состояние
    setUser(null);
    
    const response: AuthResponse = await authApi.login({ username, password });
    
    // Сохраняем новые токены (перезаписываем старые)
    localStorage.setItem('access_token', response.tokens.access);
    localStorage.setItem('refresh_token', response.tokens.refresh);
    
    // Получаем полный профиль нового пользователя
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData.user || userData);
    } catch (error) {
      // Если не удалось получить полный профиль, используем базовые данные
      const basicUser: UserProfile = {
        id: response.user.id,
        username: response.user.username,
        email: response.user.email,
        first_name: response.user.first_name || '',
        last_name: response.user.last_name || '',
        date_joined: new Date().toISOString(),
        last_login: null,
      };
      setUser(basicUser);
    }
  };

  const register = async (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
  }) => {
    const response: AuthResponse = await authApi.register(data);
    
    // Сохраняем токены
    localStorage.setItem('access_token', response.tokens.access);
    localStorage.setItem('refresh_token', response.tokens.refresh);
    
    // Получаем полный профиль пользователя
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData.user || userData);
    } catch (error) {
      // Если не удалось получить полный профиль, используем базовые данные
      const basicUser: UserProfile = {
        id: response.user.id,
        username: response.user.username,
        email: response.user.email,
        first_name: response.user.first_name || '',
        last_name: response.user.last_name || '',
        date_joined: new Date().toISOString(),
        last_login: null,
      };
      setUser(basicUser);
    }
  };

  const logout = () => {
    // Полностью очищаем все данные авторизации
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // Сбрасываем состояние пользователя
    setUser(null);
    // Принудительно обновляем состояние загрузки
    setIsLoading(false);
  };

  const refreshUser = async () => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData.user || userData);
    } catch (error) {
      console.error('Error refreshing user:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

