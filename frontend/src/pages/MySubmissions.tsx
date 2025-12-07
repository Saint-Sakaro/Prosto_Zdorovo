/**
 * Страница для просмотра заявок пользователя
 * Этап 2: Страница моих заявок
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/common/Container';
import { MySubmissionsList } from '../components/places/MySubmissionsList';
import { SubmissionDetailsModal } from '../components/places/SubmissionDetailsModal';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { getMySubmissions, PlaceSubmission } from '../api/places';
import { theme } from '../theme';

const PageWrapper = styled(motion.div)`
  min-height: calc(100vh - 80px);
  padding: ${({ theme }) => theme.spacing.xl} 0;
  background: ${({ theme }) => theme.colors.background.main};
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const LoadingCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const LoadingText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.error};
`;

const ErrorText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.accent.error};
  text-align: center;
`;

const StatsCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg};
  flex-wrap: wrap;
  justify-content: space-around;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.primary.main};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const MySubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<PlaceSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmissionUuid, setSelectedSubmissionUuid] = useState<string | null>(null);

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMySubmissions();
        setSubmissions(data);
      } catch (err: any) {
        console.error('Ошибка загрузки заявок:', err);
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            'Не удалось загрузить заявки'
        );
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, []);

  const handleSubmissionClick = (submission: PlaceSubmission) => {
    setSelectedSubmissionUuid(submission.uuid);
  };

  const handleCloseModal = () => {
    setSelectedSubmissionUuid(null);
  };

  // Подсчет статистики
  const stats = {
    total: submissions.length,
    pending: submissions.filter((s) => s.moderation_status === 'pending').length,
    approved: submissions.filter((s) => s.moderation_status === 'approved').length,
    rejected: submissions.filter((s) => s.moderation_status === 'rejected').length,
    changesRequested: submissions.filter(
      (s) => s.moderation_status === 'changes_requested'
    ).length,
  };

  return (
    <PageWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Container>
        <PageHeader>
          <PageTitle>Мои заявки</PageTitle>
          <Button variant="primary" to="/places/create">
            ➕ Создать новую заявку
          </Button>
        </PageHeader>

        {loading && (
          <LoadingCard>
            <LoadingText>Загрузка заявок...</LoadingText>
          </LoadingCard>
        )}

        {error && (
          <ErrorCard>
            <ErrorText>{error}</ErrorText>
            <div style={{ marginTop: theme.spacing.md, textAlign: 'center' }}>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Обновить
              </Button>
            </div>
          </ErrorCard>
        )}

        {!loading && !error && submissions.length > 0 && (
          <StatsCard>
            <StatItem>
              <StatValue>{stats.total}</StatValue>
              <StatLabel>Всего заявок</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{stats.pending}</StatValue>
              <StatLabel>На модерации</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{stats.approved}</StatValue>
              <StatLabel>Одобрено</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{stats.rejected}</StatValue>
              <StatLabel>Отклонено</StatLabel>
            </StatItem>
            {stats.changesRequested > 0 && (
              <StatItem>
                <StatValue>{stats.changesRequested}</StatValue>
                <StatLabel>Требуются изменения</StatLabel>
              </StatItem>
            )}
          </StatsCard>
        )}

        {!loading && !error && (
          <MySubmissionsList
            submissions={submissions}
            onSubmissionClick={handleSubmissionClick}
          />
        )}

        <SubmissionDetailsModal
          submissionUuid={selectedSubmissionUuid}
          onClose={handleCloseModal}
        />
      </Container>
    </PageWrapper>
  );
};

