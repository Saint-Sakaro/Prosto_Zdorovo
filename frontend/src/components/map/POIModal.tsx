import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { POIDetails } from '../../api/maps';
import { Button } from '../common/Button';
import { theme } from '../../theme';

interface POIModalProps {
  poi: POIDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateReview?: (poi: POIDetails) => void;
}

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const ModalContent = styled(motion.div)`
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  padding: ${({ theme }) => theme.spacing.xl};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  box-shadow: ${({ theme }) => theme.shadows.xl};
`;

const ModalHeader = styled.div`
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
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  padding: ${({ theme }) => theme.spacing.xs};
  transition: all 0.2s ease;
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const POIName = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  margin-right: ${({ theme }) => theme.spacing.md};
`;

const POIInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CategoryBadge = styled.span<{ color: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  background: ${({ color }) => `${color}20`};
  color: ${({ color }) => color};
  border: 1px solid ${({ color }) => color};
`;

const HealthScore = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.card};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ScoreValue = styled.div<{ score: number }>`
  font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
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
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ContactInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

export const POIModal: React.FC<POIModalProps> = ({
  poi,
  isOpen,
  onClose,
  onCreateReview,
}) => {
  if (!poi) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <ModalContent
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <ModalHeader>
              <POIName>{poi.name}</POIName>
              <CloseButton onClick={onClose}>×</CloseButton>
            </ModalHeader>

            <POIInfo>
              <InfoRow>
                <span>📍</span>
                <span>{poi.address}</span>
              </InfoRow>
              <InfoRow>
                <CategoryBadge color={poi.category.marker_color}>
                  {poi.category.name}
                </CategoryBadge>
              </InfoRow>
            </POIInfo>

            <HealthScore>
              <div>
                <ScoreValue score={poi.rating.health_score}>
                  {poi.rating.health_score.toFixed(1)}
                </ScoreValue>
                <ScoreLabel>Индекс здоровья</ScoreLabel>
              </div>
            </HealthScore>

            <ReviewsCount>
              Отзывов: {poi.rating.approved_reviews_count} /{' '}
              {poi.rating.reviews_count}
            </ReviewsCount>

            {poi.description && (
              <Description>{poi.description}</Description>
            )}

            {(poi.phone || poi.website) && (
              <ContactInfo>
                {poi.phone && (
                  <InfoRow>
                    <span>📞</span>
                    <span>{poi.phone}</span>
                  </InfoRow>
                )}
                {poi.website && (
                  <InfoRow>
                    <span>🌐</span>
                    <a
                      href={poi.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: theme.colors.primary.main,
                        textDecoration: 'none',
                      }}
                    >
                      {poi.website}
                    </a>
                  </InfoRow>
                )}
              </ContactInfo>
            )}

            {onCreateReview && (
              <Button
                variant="primary"
                size="md"
                onClick={() => onCreateReview(poi)}
                fullWidth
              >
                ✍️ Оставить отзыв
              </Button>
            )}
          </ModalContent>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

