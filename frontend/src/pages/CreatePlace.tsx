/**
 * Страница создания места
 * Этап 1: Ручное создание места пользователем
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/common/Container';
import { CreatePlaceForm } from '../components/places/CreatePlaceForm';
import { createPlaceSubmission, PlaceSubmissionData } from '../api/places';
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
  const [success, setSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const handleSubmit = async (data: PlaceSubmissionData) => {
    try {
      const submission = await createPlaceSubmission(data);
      setSubmissionId(submission.uuid);
      setSuccess(true);

      // Редирект через 3 секунды
      setTimeout(() => {
        navigate('/places/my-submissions');
      }, 3000);
    } catch (error) {
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
            ✅ Заявка успешно создана! Вы будете перенаправлены на страницу ваших заявок...
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

