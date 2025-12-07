/**
 * Страница для массовой загрузки мест
 * Этап 4: Массовая загрузка датасета (для модераторов)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { BulkUploadForm } from '../components/places/BulkUploadForm';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { theme } from '../theme';

const PageWrapper = styled(motion.div)`
  min-height: calc(100vh - 80px);
  padding: ${({ theme }) => theme.spacing.xl} 0;
  background: ${({ theme }) => theme.colors.background.main};
`;

const PageHeader = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PageSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 600px;
  margin: 0 auto;
`;

const InfoCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  background: ${({ theme }) => theme.colors.primary.main}10;
  border: 1px solid ${({ theme }) => theme.colors.primary.main};
`;

const InfoTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const InfoItem = styled.li`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding-left: ${({ theme }) => theme.spacing.lg};
  position: relative;

  &::before {
    content: '•';
    position: absolute;
    left: 0;
    color: ${({ theme }) => theme.colors.primary.main};
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  }
`;

const AccessDeniedCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.error};
`;

const AccessDeniedTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.accent.error};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const AccessDeniedText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const LoadingCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

export const BulkUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Проверка прав модератора
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isAuthenticated && user) {
        try {
          const userData = await authApi.getCurrentUser();
          const adminStatus =
            (userData as any).is_staff ||
            (userData as any).is_superuser ||
            (userData.user as any)?.is_staff ||
            (userData.user as any)?.is_superuser ||
            false;
          setIsAdmin(adminStatus);
          
          if (!adminStatus) {
            navigate('/', { replace: true });
          }
        } catch (error) {
          setIsAdmin(false);
          navigate('/', { replace: true });
        }
      } else {
        setIsAdmin(false);
        navigate('/', { replace: true });
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, user, navigate]);

  // Показываем загрузку, пока проверяем права
  if (isAdmin === null) {
    return (
      <PageWrapper
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Container>
          <LoadingCard>
            <div style={{ color: theme.colors.text.secondary }}>Проверка прав доступа...</div>
          </LoadingCard>
        </Container>
      </PageWrapper>
    );
  }

  // Проверка доступа
  if (!isAdmin) {
    return (
      <PageWrapper
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Container>
          <AccessDeniedCard>
            <AccessDeniedTitle>Доступ запрещен</AccessDeniedTitle>
            <AccessDeniedText>
              Эта страница доступна только модераторам
            </AccessDeniedText>
            <Button variant="primary" to="/">
              На главную
            </Button>
          </AccessDeniedCard>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Container>
        <PageHeader>
          <PageTitle>Массовая загрузка мест</PageTitle>
          <PageSubtitle>
            Загрузите Excel файл с данными о местах для быстрого добавления на карту
          </PageSubtitle>
        </PageHeader>

        <InfoCard>
          <InfoTitle>
            <span>ℹ️</span>
            <span>Информация о формате файла</span>
          </InfoTitle>
          <InfoList>
            <InfoItem>
              Файл должен быть в формате Excel (.xlsx или .xls)
            </InfoItem>
            <InfoItem>
              Обязательные колонки: название, адрес, широта, долгота, категория
            </InfoItem>
            <InfoItem>
              Если категория не существует, она будет создана автоматически (при включенной опции)
            </InfoItem>
            <InfoItem>
              Все загруженные места будут созданы со статусом "Одобрено"
            </InfoItem>
          </InfoList>
        </InfoCard>

        <BulkUploadForm />
      </Container>
    </PageWrapper>
  );
};

