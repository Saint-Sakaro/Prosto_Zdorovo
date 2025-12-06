import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styled from 'styled-components';

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px);
  color: ${({ theme }) => theme.colors.text.secondary};
`;

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingWrapper>Загрузка...</LoadingWrapper>;
  }

  if (!isAuthenticated) {
    // Сохраняем текущий путь для редиректа после входа
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

