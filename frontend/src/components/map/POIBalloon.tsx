import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { mapsApi, POIDetails } from '../../api/maps';
import { Button } from '../common/Button';
import { theme } from '../../theme';

interface POIBalloonProps {
  poiUuid: string;
  onClose: () => void;
  onCreateReview?: (poi: POIDetails) => void;
}

const BalloonWrapper = styled(motion.div)`
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  padding: ${({ theme }) => theme.spacing.lg};
  min-width: 300px;
  max-width: 400px;
  box-shadow: ${({ theme }) => theme.shadows.xl};
`;

const BalloonHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  padding: ${({ theme }) => theme.spacing.xs};
  transition: all 0.2s ease;
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const POIName = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  margin-right: ${({ theme }) => theme.spacing.md};
`;

const POIInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CategoryBadge = styled.span<{ color: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  background: ${({ color }) => `${color}20`};
  color: ${({ color }) => color};
  border: 1px solid ${({ color }) => color};
`;

const HealthScore = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background.card};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ScoreValue = styled.div<{ score: number }>`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme, score }) => {
    if (score >= 80) return theme.colors.accent.success;
    if (score >= 60) return theme.colors.accent.warning;
    return theme.colors.accent.error;
  }};
`;

const ScoreLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ReviewsCount = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ContactInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const LoadingState = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorState = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.accent.error};
`;

export const POIBalloon: React.FC<POIBalloonProps> = ({
  poiUuid,
  onClose,
  onCreateReview,
}) => {
  const [poiDetails, setPoiDetails] = useState<POIDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPOIDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await mapsApi.getPOIDetails(poiUuid);
        setPoiDetails(data);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки информации об объекте');
        console.error('Error loading POI details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPOIDetails();
  }, [poiUuid]);

  const handleCreateReview = () => {
    if (poiDetails && onCreateReview) {
      onCreateReview(poiDetails);
    }
  };

  if (loading) {
    return (
      <BalloonWrapper
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <LoadingState>Загрузка информации...</LoadingState>
      </BalloonWrapper>
    );
  }

  if (error || !poiDetails) {
    return (
      <BalloonWrapper
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <ErrorState>{error || 'Объект не найден'}</ErrorState>
        <Button variant="outline" size="sm" onClick={onClose} fullWidth>
          Закрыть
        </Button>
      </BalloonWrapper>
    );
  }

  return (
    <BalloonWrapper
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <BalloonHeader>
        <POIName>{poiDetails.name}</POIName>
        <CloseButton onClick={onClose}>×</CloseButton>
      </BalloonHeader>

      <POIInfo>
        <InfoRow>
          <span>📍</span>
          <span>{poiDetails.address}</span>
        </InfoRow>
        <InfoRow>
          <CategoryBadge color={poiDetails.category.marker_color}>
            {poiDetails.category.name}
          </CategoryBadge>
        </InfoRow>
      </POIInfo>

      <HealthScore>
        <ScoreValue score={poiDetails.rating.health_score}>
          {poiDetails.rating.health_score.toFixed(1)}
        </ScoreValue>
        <ScoreLabel>Индекс здоровья</ScoreLabel>
      </HealthScore>

      <ReviewsCount>
        Отзывов: {poiDetails.rating.approved_reviews_count} /{' '}
        {poiDetails.rating.reviews_count}
      </ReviewsCount>

      {poiDetails.description && (
        <Description>{poiDetails.description}</Description>
      )}

      {(poiDetails.phone || poiDetails.website) && (
        <ContactInfo>
          {poiDetails.phone && (
            <InfoRow>
              <span>📞</span>
              <span>{poiDetails.phone}</span>
            </InfoRow>
          )}
          {poiDetails.website && (
            <InfoRow>
              <span>🌐</span>
              <a
                href={poiDetails.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: theme.colors.primary.main,
                  textDecoration: 'none',
                }}
              >
                {poiDetails.website}
              </a>
            </InfoRow>
          )}
        </ContactInfo>
      )}

      {onCreateReview && (
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreateReview}
          fullWidth
        >
          ✍️ Оставить отзыв
        </Button>
      )}
    </BalloonWrapper>
  );
};

