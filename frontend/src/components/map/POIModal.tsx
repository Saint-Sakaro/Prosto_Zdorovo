import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { POIDetails } from '../../api/maps';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { theme } from '../../theme';
import { RatingDetails } from '../poi/RatingDetails';
import { ratingsApi } from '../../api/maps';
import { gamificationApi, Review } from '../../api/gamification';

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

const VerifiedBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => `${theme.colors.accent.success}20`};
  color: ${({ theme }) => theme.colors.accent.success};
  border: 1px solid ${({ theme }) => theme.colors.accent.success};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const RatingComponents = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.main};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const RatingComponent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const RatingLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const RatingValue = styled.span<{ value: number }>`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme, value }) => {
    if (value >= 80) return theme.colors.accent.success;
    if (value >= 60) return theme.colors.accent.warning;
    return theme.colors.accent.error;
  }};
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

const TabsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.main};
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: transparent;
  border: none;
  border-bottom: 2px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary.main : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary.main : theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme, $active }) =>
    $active
      ? theme.typography.fontWeight.semibold
      : theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary.main};
  }
`;

const TabContent = styled.div`
  max-height: 60vh;
  overflow-y: auto;
`;

export const POIModal: React.FC<POIModalProps> = ({
  poi,
  isOpen,
  onClose,
  onCreateReview,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'rating' | 'reviews'>('info');
  const [poiData, setPoiData] = useState<POIDetails | null>(poi);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Обновляем данные POI при изменении
  React.useEffect(() => {
    setPoiData(poi);
  }, [poi]);

  // Загрузка отзывов для POI
  useEffect(() => {
    const loadReviews = async () => {
      if (!poiData || activeTab !== 'reviews') return;

      try {
        setReviewsLoading(true);
        // Загружаем отзывы, связанные с этим POI через координаты или UUID
        const result = await gamificationApi.getReviews({
          review_type: 'poi_review',
          moderation_status: 'approved',
          limit: 50,
        });

        // Фильтруем отзывы по координатам POI (в радиусе 50 метров)
        const poiLat = poiData.latitude;
        const poiLon = poiData.longitude;
        const filteredReviews = result.results.filter((review) => {
          const distance = Math.sqrt(
            Math.pow(review.latitude - poiLat, 2) + Math.pow(review.longitude - poiLon, 2)
          );
          // Примерно 50 метров в градусах (1 градус ≈ 111 км)
          return distance < 0.00045 || review.poi === poiData.uuid;
        });

        setReviews(filteredReviews);
      } catch (err) {
        console.error('Ошибка загрузки отзывов:', err);
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    loadReviews();
  }, [poiData, activeTab]);

  if (!poiData) return null;

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
              <POIName>{poiData.name}</POIName>
              <CloseButton onClick={onClose}>×</CloseButton>
            </ModalHeader>

            <TabsContainer>
              <Tab
                $active={activeTab === 'info'}
                onClick={() => setActiveTab('info')}
              >
                Информация
              </Tab>
              <Tab
                $active={activeTab === 'rating'}
                onClick={() => setActiveTab('rating')}
              >
                Рейтинг
              </Tab>
              <Tab
                $active={activeTab === 'reviews'}
                onClick={() => setActiveTab('reviews')}
              >
                Отзывы ({poiData.rating.approved_reviews_count})
              </Tab>
            </TabsContainer>

            <TabContent>
              {activeTab === 'info' && (
                <>
                  <POIInfo>
                    <InfoRow>
                      <span>📍</span>
                      <span>{poiData.address}</span>
                    </InfoRow>
                    <InfoRow>
                      <CategoryBadge color={poiData.category.marker_color}>
                        {poiData.category.name}
                      </CategoryBadge>
                      {/* Верификация */}
                      {poiData.verified && (
                        <VerifiedBadge>
                          <span>✅</span>
                          <span>Верифицирован</span>
                        </VerifiedBadge>
                      )}
                    </InfoRow>
                  </POIInfo>

                  <HealthScore>
                    <div>
                      <ScoreValue score={poiData.rating.health_score}>
                        {poiData.rating.health_score.toFixed(1)}
                      </ScoreValue>
                      <ScoreLabel>Индекс здоровья</ScoreLabel>
                    </div>
                  </HealthScore>

                  {/* Компоненты рейтинга (если доступны) */}
                  {(poiData.rating.S_infra !== undefined || 
                    poiData.rating.S_social !== undefined || 
                    poiData.rating.S_HIS !== undefined) && (
                    <RatingComponents>
                      <div style={{ 
                        fontSize: theme.typography.fontSize.sm, 
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.text.primary,
                        marginBottom: theme.spacing.xs 
                      }}>
                        Компоненты рейтинга:
                      </div>
                      {poiData.rating.S_infra !== undefined && (
                        <RatingComponent>
                          <RatingLabel>Инфраструктурный:</RatingLabel>
                          <RatingValue value={poiData.rating.S_infra}>
                            {poiData.rating.S_infra.toFixed(1)}
                          </RatingValue>
                        </RatingComponent>
                      )}
                      {poiData.rating.S_social !== undefined && (
                        <RatingComponent>
                          <RatingLabel>Социальный:</RatingLabel>
                          <RatingValue value={poiData.rating.S_social}>
                            {poiData.rating.S_social.toFixed(1)}
                          </RatingValue>
                        </RatingComponent>
                      )}
                      {poiData.rating.S_HIS !== undefined && (
                        <RatingComponent>
                          <RatingLabel>Итоговый HIS:</RatingLabel>
                          <RatingValue value={poiData.rating.S_HIS}>
                            {poiData.rating.S_HIS.toFixed(1)}
                          </RatingValue>
                        </RatingComponent>
                      )}
                    </RatingComponents>
                  )}

                  <ReviewsCount>
                    Отзывов: {poiData.rating.approved_reviews_count} /{' '}
                    {poiData.rating.reviews_count}
                  </ReviewsCount>

                  {poiData.description && (
                    <Description>{poiData.description}</Description>
                  )}

                  {(poiData.phone || poiData.website) && (
                    <ContactInfo>
                      {poiData.phone && (
                        <InfoRow>
                          <span>📞</span>
                          <span>{poiData.phone}</span>
                        </InfoRow>
                      )}
                      {poiData.website && (
                        <InfoRow>
                          <span>🌐</span>
                          <a
                            href={poiData.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: theme.colors.primary.main,
                              textDecoration: 'none',
                            }}
                          >
                            {poiData.website}
                          </a>
                        </InfoRow>
                      )}
                    </ContactInfo>
                  )}

                  {onCreateReview && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => onCreateReview(poiData)}
                      fullWidth
                    >
                      ✍️ Оставить отзыв
                    </Button>
                  )}
                </>
              )}

              {activeTab === 'rating' && (
                <RatingDetails poi={poiData} />
              )}

              {activeTab === 'reviews' && (
                <div>
                  {reviewsLoading ? (
                    <div style={{ 
                      padding: theme.spacing.xl, 
                      textAlign: 'center',
                      color: theme.colors.text.secondary 
                    }}>
                      Загрузка отзывов...
                    </div>
                  ) : reviews.length === 0 ? (
                    <div style={{ 
                      padding: theme.spacing.xl, 
                      textAlign: 'center',
                      color: theme.colors.text.secondary 
                    }}>
                      <p>Пока нет отзывов об этом объекте</p>
                      {onCreateReview && (
                        <div style={{ marginTop: theme.spacing.md }}>
                          <Button
                            variant="primary"
                            onClick={() => onCreateReview(poiData)}
                            fullWidth
                          >
                            ✍️ Оставить первый отзыв
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                      {reviews.map((review) => (
                        <Card key={review.uuid} padding={theme.spacing.md}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'start',
                            marginBottom: theme.spacing.sm 
                          }}>
                            <div>
                              <div style={{ 
                                fontWeight: theme.typography.fontWeight.semibold,
                                color: theme.colors.text.primary,
                                marginBottom: theme.spacing.xs
                              }}>
                                @{review.author_username}
                              </div>
                              {review.rating && (
                                <div style={{ 
                                  fontSize: theme.typography.fontSize.sm,
                                  color: theme.colors.text.secondary,
                                  marginBottom: theme.spacing.xs
                                }}>
                                  Оценка: {'⭐'.repeat(review.rating)} {review.rating}/5
                                </div>
                              )}
                            </div>
                            <div style={{ 
                              fontSize: theme.typography.fontSize.xs,
                              color: theme.colors.text.muted
                            }}>
                              {new Date(review.created_at).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                          <div style={{ 
                            color: theme.colors.text.primary,
                            lineHeight: theme.typography.lineHeight.relaxed,
                            marginBottom: theme.spacing.sm
                          }}>
                            {review.content}
                          </div>
                          {review.has_media && (
                            <div style={{ 
                              fontSize: theme.typography.fontSize.xs,
                              color: theme.colors.primary.main
                            }}>
                              📷 Есть медиа
                            </div>
                          )}
                        </Card>
                      ))}
                      {onCreateReview && (
                        <Button
                          variant="outline"
                          onClick={() => onCreateReview(poiData)}
                          fullWidth
                        >
                          ✍️ Оставить отзыв
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabContent>
          </ModalContent>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

