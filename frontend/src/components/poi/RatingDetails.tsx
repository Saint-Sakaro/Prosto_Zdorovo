import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { theme } from '../../theme';
import { POIDetails, POIRatingDetails } from '../../api/maps';

interface RatingDetailsProps {
  poi: POIDetails;
  ratingDetails?: POIRatingDetails | null;
  onClose?: () => void;
}

const DetailsContainer = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  padding: ${({ theme }) => theme.spacing.xs};
  transition: all 0.2s ease;
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const RatingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const RatingCard = styled(motion.div)<{ value: number; label: string }>`
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background.card};
  border: 2px solid
    ${({ theme, value }) => {
      if (value >= 80) return theme.colors.accent.success;
      if (value >= 60) return theme.colors.accent.warning;
      return theme.colors.accent.error;
    }};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  text-align: center;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadows.xl};
  }
`;

const RatingLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const RatingValue = styled.div<{ value: number }>`
  font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  color: ${({ theme, value }) => {
    if (value >= 80) return theme.colors.accent.success;
    if (value >= 60) return theme.colors.accent.warning;
    return theme.colors.accent.error;
  }};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const RatingDescription = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.colors.background.main};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  overflow: hidden;
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const ProgressFill = styled.div<{ value: number; max: number }>`
  height: 100%;
  width: ${({ value, max }) => (value / max) * 100}%;
  background: ${({ theme, value }) => {
    if (value >= 80) return theme.colors.accent.success;
    if (value >= 60) return theme.colors.accent.warning;
    return theme.colors.accent.error;
  }};
  transition: width 0.5s ease;
`;

const Section = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SectionTitle = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const MetadataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.sm};
`;

const MetadataItem = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background.main};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const MetadataLabel = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const MetadataValue = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const StatsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.main};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const StatsLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
`;

const StatsValue = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
`;

export const RatingDetails: React.FC<RatingDetailsProps> = ({
  poi,
  ratingDetails,
  onClose,
}) => {
  // Используем данные из ratingDetails или из poi.rating
  const rating = ratingDetails || {
    S_infra: poi.rating.S_infra,
    S_social: poi.rating.S_social,
    S_HIS: poi.rating.S_HIS || poi.rating.health_score,
    health_score: poi.rating.health_score,
    reviews_count: poi.rating.reviews_count,
    approved_reviews_count: poi.rating.approved_reviews_count,
    last_infra_calculation: poi.rating.last_infra_calculation,
    last_social_calculation: poi.rating.last_social_calculation,
    calculation_metadata: poi.rating.calculation_metadata || {},
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Не рассчитано';
    try {
      return new Date(dateString).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getRatingDescription = (value: number, type: string) => {
    if (value >= 80) return 'Отличный';
    if (value >= 60) return 'Хороший';
    if (value >= 40) return 'Средний';
    return 'Низкий';
  };

  return (
    <DetailsContainer>
      <Header>
        <Title>Детали рейтинга</Title>
        {onClose && <CloseButton onClick={onClose}>×</CloseButton>}
      </Header>

      <RatingGrid>
        {rating.S_infra !== undefined && (
          <RatingCard
            value={rating.S_infra}
            label="Инфраструктурный"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <RatingLabel>Инфраструктурный рейтинг</RatingLabel>
            <RatingValue value={rating.S_infra}>
              {rating.S_infra.toFixed(1)}
            </RatingValue>
            <RatingDescription>
              {getRatingDescription(rating.S_infra, 'infra')}
            </RatingDescription>
            <ProgressBar>
              <ProgressFill value={rating.S_infra} max={100} />
            </ProgressBar>
          </RatingCard>
        )}

        {rating.S_social !== undefined && (
          <RatingCard
            value={rating.S_social}
            label="Социальный"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <RatingLabel>Социальный рейтинг</RatingLabel>
            <RatingValue value={rating.S_social}>
              {rating.S_social.toFixed(1)}
            </RatingValue>
            <RatingDescription>
              {getRatingDescription(rating.S_social, 'social')}
            </RatingDescription>
            <ProgressBar>
              <ProgressFill value={rating.S_social} max={100} />
            </ProgressBar>
          </RatingCard>
        )}

        <RatingCard
          value={rating.S_HIS || rating.health_score}
          label="Итоговый"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <RatingLabel>Итоговый Health Impact Score</RatingLabel>
          <RatingValue value={rating.S_HIS || rating.health_score}>
            {(rating.S_HIS || rating.health_score).toFixed(1)}
          </RatingValue>
          <RatingDescription>
            {getRatingDescription(
              rating.S_HIS || rating.health_score,
              'his'
            )}
          </RatingDescription>
          <ProgressBar>
            <ProgressFill
              value={rating.S_HIS || rating.health_score}
              max={100}
            />
          </ProgressBar>
        </RatingCard>
      </RatingGrid>

      <Section>
        <SectionTitle>Статистика отзывов</SectionTitle>
        <StatsRow>
          <StatsLabel>Всего отзывов:</StatsLabel>
          <StatsValue>{rating.reviews_count}</StatsValue>
        </StatsRow>
        <StatsRow>
          <StatsLabel>Одобрено:</StatsLabel>
          <StatsValue>{rating.approved_reviews_count}</StatsValue>
        </StatsRow>
        <StatsRow>
          <StatsLabel>Ожидает модерации:</StatsLabel>
          <StatsValue>
            {rating.reviews_count - rating.approved_reviews_count}
          </StatsValue>
        </StatsRow>
      </Section>

      {(rating.last_infra_calculation ||
        rating.last_social_calculation ||
        Object.keys(rating.calculation_metadata || {}).length > 0) && (
        <Section>
          <SectionTitle>Метаданные расчета</SectionTitle>
          <MetadataGrid>
            {rating.last_infra_calculation && (
              <MetadataItem>
                <MetadataLabel>Последний расчет инфраструктурного:</MetadataLabel>
                <MetadataValue>
                  {formatDate(rating.last_infra_calculation)}
                </MetadataValue>
              </MetadataItem>
            )}
            {rating.last_social_calculation && (
              <MetadataItem>
                <MetadataLabel>Последний расчет социального:</MetadataLabel>
                <MetadataValue>
                  {formatDate(rating.last_social_calculation)}
                </MetadataValue>
              </MetadataItem>
            )}
            {Object.keys(rating.calculation_metadata || {}).map((key) => (
              <MetadataItem key={key}>
                <MetadataLabel>{key}:</MetadataLabel>
                <MetadataValue>
                  {typeof rating.calculation_metadata[key] === 'object'
                    ? JSON.stringify(rating.calculation_metadata[key])
                    : String(rating.calculation_metadata[key])}
                </MetadataValue>
              </MetadataItem>
            ))}
          </MetadataGrid>
        </Section>
      )}
    </DetailsContainer>
  );
};

