import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/common/Container';
import { ReviewForm } from '../components/reviews/ReviewForm';
import { gamificationApi } from '../api/gamification';
import { theme } from '../theme';

const CreateReviewWrapper = styled.div`
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

const FormContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const SuccessMessage = styled(motion.div)`
  padding: ${({ theme }) => theme.spacing.xl};
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.success};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.accent.success};
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

export const CreateReview: React.FC = () => {
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const handleSubmit = async (data: {
    review_type: 'poi_review' | 'incident';
    latitude: number;
    longitude: number;
    category: string;
    content: string;
    has_media: boolean;
    poi?: string;
  }) => {
    try {
      const review = await gamificationApi.createReview(data);
      setReviewId(review.uuid);
      setSuccess(true);

      // Редирект через 3 секунды
      setTimeout(() => {
        navigate('/reviews');
      }, 3000);
    } catch (error: any) {
      // Ошибка будет обработана в ReviewForm компоненте
      throw error;
    }
  };

  return (
    <CreateReviewWrapper>
      <Container>
        <PageHeader
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PageTitle>Создать отзыв</PageTitle>
          <PageSubtitle>
            Поделитесь информацией о месте или зафиксируйте инцидент
          </PageSubtitle>
        </PageHeader>

        <FormContainer>
          {success && (
            <SuccessMessage
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              ✅ Отзыв успешно создан! Вы будете перенаправлены на страницу
              отзывов...
            </SuccessMessage>
          )}

          <ReviewForm onSubmit={handleSubmit} />
        </FormContainer>
      </Container>
    </CreateReviewWrapper>
  );
};

