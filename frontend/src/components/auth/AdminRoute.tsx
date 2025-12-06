import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import styled from 'styled-components';

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px);
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px);
  gap: ${({ theme }) => theme.spacing.lg};
  text-align: center;
`;

const ErrorTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.accent.error};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ErrorText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      try {
        // Пытаемся получить данные текущего пользователя через auth API
        const userData = await authApi.getCurrentUser();
        // Проверяем, есть ли поле is_staff или is_superuser
        const adminStatus =
          (userData as any).is_staff ||
          (userData as any).is_superuser ||
          (userData.user as any)?.is_staff ||
          (userData.user as any)?.is_superuser ||
          false;
        setIsAdmin(adminStatus);
      } catch (error) {
        // Если не удалось проверить, считаем что не админ
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated]);

  if (isLoading || checking) {
    return <LoadingWrapper>Проверка прав доступа...</LoadingWrapper>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <ErrorWrapper>
        <ErrorTitle>Доступ запрещен</ErrorTitle>
        <ErrorText>
          У вас нет прав доступа к этой странице. Требуются права администратора.
        </ErrorText>
      </ErrorWrapper>
    );
  }

  return <>{children}</>;
};

