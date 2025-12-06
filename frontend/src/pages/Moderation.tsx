import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { Select } from '../components/common/Select';
import { ModerationReviewCard } from '../components/moderation/ModerationReviewCard';
import { gamificationApi, Review } from '../api/gamification';
import { theme } from '../theme';

const ModerationWrapper = styled.div`
  min-height: calc(100vh - 80px);
  padding: ${({ theme }) => theme.spacing['2xl']} 0;
`;

const PageHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing['3xl']};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize['5xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const PageSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StatsCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

const StatItem = styled.div``;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const FiltersCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const FiltersRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
  align-items: center;
`;

const ReviewsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const EmptyState = styled(Card)`
  padding: ${({ theme }) => theme.spacing['4xl']};
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize['6xl']};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const EmptyText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing['4xl']};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing['4xl']};
  color: ${({ theme }) => theme.colors.accent.error};
`;

const SuccessMessage = styled(motion.div)`
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.success};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.accent.success};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const PaginationWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const PaginationButton = styled.button<{ disabled?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme, disabled }) =>
    disabled
      ? 'rgba(255, 255, 255, 0.05)'
      : theme.colors.background.card};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  color: ${({ theme, disabled }) =>
    disabled ? theme.colors.text.muted : theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primary.main};
    color: ${({ theme }) => theme.colors.text.inverse};
    border-color: ${({ theme }) => theme.colors.primary.main};
  }
`;

const PageInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const Moderation: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    review_type: '',
    has_media: '',
    category: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchPendingReviews();
  }, [filters, currentPage]);

  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        limit,
        offset: (currentPage - 1) * limit,
      };

      if (filters.review_type) {
        params.review_type = filters.review_type;
      }
      if (filters.has_media !== '') {
        params.has_media = filters.has_media === 'true';
      }
      if (filters.category) {
        params.category = filters.category;
      }

      const data = await gamificationApi.getPendingReviews(params);
      setReviews(data.results || []);
      setTotalCount(data.count || data.results?.length || 0);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки отзывов на модерацию');
      console.error('Error fetching pending reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (
    reviewId: string,
    action: 'approve' | 'soft_reject' | 'spam_block',
    comment?: string
  ) => {
    try {
      setProcessingId(reviewId);
      setError(null);
      setSuccessMessage(null);

      // Находим review по UUID и получаем его ID
      const review = reviews.find((r) => r.uuid === reviewId);
      if (!review) {
        throw new Error('Отзыв не найден');
      }

      // Используем ID если есть, иначе UUID
      const reviewIdentifier = (review as any).id || review.uuid;
      await gamificationApi.moderateReview(reviewIdentifier, action, comment);

      setSuccessMessage(
        `Отзыв успешно ${action === 'approve' ? 'подтвержден' : action === 'soft_reject' ? 'отклонен' : 'заблокирован'}`
      );

      // Удаляем отзыв из списка
      setReviews((prev) => prev.filter((r) => r.uuid !== reviewId));
      setTotalCount((prev) => Math.max(0, prev - 1));

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Ошибка при модерации отзыва'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  if (loading && reviews.length === 0) {
    return (
      <ModerationWrapper>
        <Container>
          <LoadingState>Загрузка отзывов на модерацию...</LoadingState>
        </Container>
      </ModerationWrapper>
    );
  }

  if (error && reviews.length === 0) {
    return (
      <ModerationWrapper>
        <Container>
          <ErrorState>Ошибка: {error}</ErrorState>
        </Container>
      </ModerationWrapper>
    );
  }

  return (
    <ModerationWrapper>
      <Container>
        <PageHeader
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PageTitle>Модерация отзывов</PageTitle>
          <PageSubtitle>
            Проверяйте и модерируйте отзывы пользователей
          </PageSubtitle>
        </PageHeader>

        <StatsCard glow>
          <StatItem>
            <StatValue>{totalCount}</StatValue>
            <StatLabel>На модерации</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{reviews.length}</StatValue>
            <StatLabel>На странице</StatLabel>
          </StatItem>
        </StatsCard>

        <FiltersCard>
          <FiltersRow>
            <Select
              label="Тип отзыва"
              value={filters.review_type}
              onChange={(value) =>
                setFilters({ ...filters, review_type: value })
              }
              options={[
                { value: '', label: 'Все типы' },
                { value: 'poi_review', label: 'Отзывы о местах' },
                { value: 'incident', label: 'Инциденты' },
              ]}
              placeholder="Все типы"
              fullWidth={false}
            />

            <Select
              label="Медиа"
              value={filters.has_media}
              onChange={(value) => setFilters({ ...filters, has_media: value })}
              options={[
                { value: '', label: 'Все' },
                { value: 'true', label: 'С медиа' },
                { value: 'false', label: 'Без медиа' },
              ]}
              placeholder="Все"
              fullWidth={false}
            />
          </FiltersRow>
        </FiltersCard>

        {successMessage && (
          <SuccessMessage
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {successMessage}
          </SuccessMessage>
        )}

        {error && (
          <motion.div
            style={{
              padding: theme.spacing.md,
              background: 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${theme.colors.accent.error}`,
              borderRadius: theme.borderRadius.lg,
              color: theme.colors.accent.error,
              textAlign: 'center',
              marginBottom: theme.spacing.xl,
            }}
          >
            {error}
          </motion.div>
        )}

        {reviews.length === 0 ? (
          <EmptyState>
            <EmptyIcon>✅</EmptyIcon>
            <EmptyText>Нет отзывов, ожидающих модерации</EmptyText>
          </EmptyState>
        ) : (
          <>
            <ReviewsList>
              {reviews.map((review) => (
                <ModerationReviewCard
                  key={review.uuid}
                  review={review}
                  onModerate={(action, comment) =>
                    handleModerate(review.uuid, action, comment)
                  }
                  isProcessing={processingId === review.uuid}
                />
              ))}
            </ReviewsList>

            {totalPages > 1 && (
              <PaginationWrapper>
                <PaginationButton
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={!hasPrevPage}
                >
                  ← Назад
                </PaginationButton>
                <PageInfo>
                  Страница {currentPage} из {totalPages}
                </PageInfo>
                <PaginationButton
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={!hasNextPage}
                >
                  Вперед →
                </PaginationButton>
              </PaginationWrapper>
            )}
          </>
        )}
      </Container>
    </ModerationWrapper>
  );
};

