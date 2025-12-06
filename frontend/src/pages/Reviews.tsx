import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { ReviewCard } from '../components/reviews/ReviewCard';
import { gamificationApi, Review } from '../api/gamification';
import { theme } from '../theme';

const ReviewsWrapper = styled.div`
  min-height: calc(100vh - 80px);
  padding: ${({ theme }) => theme.spacing['2xl']} 0;
`;

const PageHeader = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing['3xl']};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeaderText = styled.div`
  flex: 1;
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


const ReviewsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
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
  margin-bottom: ${({ theme }) => theme.spacing.xl};
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

export const Reviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    review_type: '',
    moderation_status: '',
  });

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const params: any = {};
        if (filters.review_type) {
          params.review_type = filters.review_type;
        }
        if (filters.moderation_status) {
          params.moderation_status = filters.moderation_status;
        }

        const data = await gamificationApi.getReviews(params);
        setReviews(data.results || []);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки отзывов');
        console.error('Error fetching reviews:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [filters]);

  if (loading) {
    return (
      <ReviewsWrapper>
        <Container>
          <LoadingState>Загрузка отзывов...</LoadingState>
        </Container>
      </ReviewsWrapper>
    );
  }

  if (error) {
    return (
      <ReviewsWrapper>
        <Container>
          <ErrorState>Ошибка: {error}</ErrorState>
        </Container>
      </ReviewsWrapper>
    );
  }

  return (
    <ReviewsWrapper>
      <Container>
        <PageHeader
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <HeaderText>
            <PageTitle>Отзывы и инциденты</PageTitle>
            <PageSubtitle>
              Просматривайте отзывы о местах и зафиксированные инциденты
            </PageSubtitle>
          </HeaderText>
          <Button to="/reviews/create" size="lg">
            + Создать отзыв
          </Button>
        </PageHeader>

        <FiltersCard>
          <FiltersRow>
            <Select
              label="Тип"
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
              label="Статус"
              value={filters.moderation_status}
              onChange={(value) =>
                setFilters({ ...filters, moderation_status: value })
              }
              options={[
                { value: '', label: 'Все статусы' },
                { value: 'pending', label: 'На модерации' },
                { value: 'approved', label: 'Подтвержденные' },
                { value: 'soft_reject', label: 'Неактуальные' },
                { value: 'spam_blocked', label: 'Спам' },
              ]}
              placeholder="Все статусы"
              fullWidth={false}
            />
          </FiltersRow>
        </FiltersCard>

        {reviews.length === 0 ? (
          <EmptyState>
            <EmptyIcon>📝</EmptyIcon>
            <EmptyText>Отзывов не найдено</EmptyText>
            <Button to="/reviews/create">Создать первый отзыв</Button>
          </EmptyState>
        ) : (
          <ReviewsGrid>
            {reviews.map((review) => (
              <ReviewCard key={review.uuid} review={review} />
            ))}
          </ReviewsGrid>
        )}
      </Container>
    </ReviewsWrapper>
  );
};

