import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { Review } from '../../api/gamification';
import { theme } from '../../theme';

interface ReviewCardProps {
  review: Review;
  onClick?: () => void;
}

const ReviewCardWrapper = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg};
  cursor: ${({ onClick }) => (onClick ? 'pointer' : 'default')};
  transition: all 0.2s ease;

  &:hover {
    transform: ${({ onClick }) => (onClick ? 'translateY(-4px)' : 'none')};
  }
`;

const ReviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  gap: ${({ theme }) => theme.spacing.md};
`;

const ReviewType = styled.div<{ type: string }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  background: ${({ type, theme }) =>
    type === 'poi_review'
      ? `${theme.colors.primary.main}20`
      : `${theme.colors.accent.warning}20`};
  color: ${({ type, theme }) =>
    type === 'poi_review'
      ? theme.colors.primary.main
      : theme.colors.accent.warning};
  border: 1px solid
    ${({ type, theme }) =>
      type === 'poi_review'
        ? theme.colors.primary.main
        : theme.colors.accent.warning};
`;

const StatusBadge = styled.div.withConfig({
  shouldForwardProp: (prop) => !['status'].includes(prop),
})<{ status: string }>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${({ status, theme }) => {
    switch (status) {
      case 'approved':
        return `
          background: ${theme.colors.accent.success}20;
          color: ${theme.colors.accent.success};
          border: 1px solid ${theme.colors.accent.success};
        `;
      case 'pending':
        return `
          background: ${theme.colors.accent.warning}20;
          color: ${theme.colors.accent.warning};
          border: 1px solid ${theme.colors.accent.warning};
        `;
      case 'soft_reject':
        return `
          background: ${theme.colors.text.muted}20;
          color: ${theme.colors.text.muted};
          border: 1px solid ${theme.colors.text.muted};
        `;
      case 'spam_blocked':
        return `
          background: ${theme.colors.accent.error}20;
          color: ${theme.colors.accent.error};
          border: 1px solid ${theme.colors.accent.error};
        `;
      default:
        return '';
    }
  }}
`;

const ReviewMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Category = styled.span`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background.card};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const Author = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Content = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ReviewFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border.main};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const MediaBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.primary.main};
`;

const UniqueBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.accent.success};
`;

const statusLabels = {
  pending: 'На модерации',
  approved: 'Подтвержден',
  soft_reject: 'Неактуален',
  spam_blocked: 'Спам',
};

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onClick }) => {
  const formattedDate = new Date(review.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ReviewCardWrapper onClick={onClick} hover={!!onClick}>
        <ReviewHeader>
          <ReviewType type={review.review_type}>
            <span>
              {review.review_type === 'poi_review' ? '📍' : '⚠️'}
            </span>
            <span>
              {review.review_type === 'poi_review'
                ? 'Отзыв о месте'
                : 'Инцидент'}
            </span>
          </ReviewType>
          <StatusBadge status={review.moderation_status}>
            {statusLabels[review.moderation_status] || review.moderation_status}
          </StatusBadge>
        </ReviewHeader>

        <ReviewMeta>
          <Author>@{review.author_username}</Author>
          <Category>{review.category}</Category>
          {review.is_unique && (
            <UniqueBadge>
              <span>✨</span>
              <span>Уникальный</span>
            </UniqueBadge>
          )}
          {review.has_media && (
            <MediaBadge>
              <span>📷</span>
              <span>С медиа</span>
            </MediaBadge>
          )}
        </ReviewMeta>

        <Content>{review.content}</Content>

        <ReviewFooter>
          <div>{formattedDate}</div>
          <div>
            {review.latitude != null && review.longitude != null
              ? `${Number(review.latitude).toFixed(4)}, ${Number(review.longitude).toFixed(4)}`
              : 'Координаты не указаны'}
          </div>
        </ReviewFooter>
      </ReviewCardWrapper>
    </motion.div>
  );
};

