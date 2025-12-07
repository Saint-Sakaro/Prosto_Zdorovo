/**
 * Страница создания места
 * Этап 1: Ручное создание места пользователем
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/common/Container';
import { CreatePlaceForm } from '../components/places/CreatePlaceForm';
import { createPlaceSubmission, PlaceSubmissionData } from '../api/places';
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

const SuccessMessage = styled(motion.div)`
  padding: ${({ theme }) => theme.spacing.xl};
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.success};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  color: ${({ theme }) => theme.colors.accent.success};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

export const CreatePlacePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [success, setSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isModerator, setIsModerator] = useState(false);

  // Проверка, является ли пользователь модератором
  useEffect(() => {
    const checkModeratorStatus = async () => {
      if (isAuthenticated && user) {
        try {
          const userData = await authApi.getCurrentUser();
          const moderatorStatus =
            (userData as any).is_staff ||
            (userData as any).is_superuser ||
            (userData.user as any)?.is_staff ||
            (userData.user as any)?.is_superuser ||
            false;
          setIsModerator(moderatorStatus);
        } catch (error) {
          setIsModerator(false);
        }
      }
    };

    checkModeratorStatus();
  }, [isAuthenticated, user]);

  const handleSubmit = async (data: PlaceSubmissionData) => {
    try {
      const submission = await createPlaceSubmission(data);
      setSubmissionId(submission.uuid);
      setSuccess(true);

      // Редирект через 2 секунды
      // Модераторы перенаправляются в модерацию, обычные пользователи - в свои заявки
      setTimeout(() => {
        if (isModerator) {
          navigate('/places/moderation');
        } else {
          navigate('/places/my-submissions');
        }
      }, 2000);
    } catch (error: any) {
      // Ошибка будет обработана в CreatePlaceForm компоненте
      throw error;
    }
  };

  return (
    <PageWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Container>
        <PageHeader>
          <PageTitle>Создать место</PageTitle>
          <PageSubtitle>
            Добавьте новое место на карту здоровья. После модерации оно появится для всех пользователей.
          </PageSubtitle>
        </PageHeader>

        {success && (
          <SuccessMessage
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            ✅ Заявка успешно создана!
            {isModerator ? (
              <> Заявка автоматически подтверждена. Вы будете перенаправлены в модерацию...</>
            ) : (
              <> Вы будете перенаправлены на страницу ваших заявок...</>
            )}
          </SuccessMessage>
        )}

        <CreatePlaceForm
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
        />
      </Container>
    </PageWrapper>
  );
};

