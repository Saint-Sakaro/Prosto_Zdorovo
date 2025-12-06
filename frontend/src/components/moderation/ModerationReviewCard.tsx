import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Review } from '../../api/gamification';
import { theme } from '../../theme';

interface ModerationReviewCardProps {
  review: Review;
  onModerate: (action: 'approve' | 'soft_reject' | 'spam_block', comment?: string) => void;
  isProcessing?: boolean;
}

const ReviewCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ReviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  gap: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
`;

const ReviewMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  flex: 1;
`;

const ReviewType = styled.div<{ type: string }>`
  display: inline-flex;
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
  width: fit-content;
`;

const AuthorInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`;

const ReviewDetails = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Content = styled.div`
  background: ${({ theme }) => theme.colors.background.card};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  white-space: pre-wrap;
`;

const CoordinatesInfo = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background.card};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const BadgesRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
`;

const Badge = styled.span<{ variant: string }>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${({ variant, theme }) => {
    switch (variant) {
      case 'unique':
        return `
          background: ${theme.colors.accent.success}20;
          color: ${theme.colors.accent.success};
          border: 1px solid ${theme.colors.accent.success};
        `;
      case 'media':
        return `
          background: ${theme.colors.primary.main}20;
          color: ${theme.colors.primary.main};
          border: 1px solid ${theme.colors.primary.main};
        `;
      default:
        return '';
    }
  }}
`;

const ActionsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border.main};
  flex-wrap: wrap;
`;

const CommentInput = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.card};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.main};
  min-height: 80px;
  resize: vertical;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
    box-shadow: ${({ theme }) => theme.shadows.glow};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const SpamButton = styled(Button)`
  color: ${({ theme }) => theme.colors.accent.error} !important;
  border-color: ${({ theme }) => theme.colors.accent.error} !important;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.accent.error}20;
    color: ${({ theme }) => theme.colors.accent.error} !important;
  }
`;

export const ModerationReviewCard: React.FC<ModerationReviewCardProps> = ({
  review,
  onModerate,
  isProcessing = false,
}) => {
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);

  const formattedDate = new Date(review.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleAction = (action: 'approve' | 'soft_reject' | 'spam_block') => {
    if (showComment && comment.trim()) {
      onModerate(action, comment.trim());
    } else {
      onModerate(action);
    }
    setComment('');
    setShowComment(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ReviewCard glow>
        <ReviewHeader>
          <ReviewMeta>
            <ReviewType type={review.review_type}>
              <span>{review.review_type === 'poi_review' ? '📍' : '⚠️'}</span>
              <span>
                {review.review_type === 'poi_review'
                  ? 'Отзыв о месте'
                  : 'Инцидент'}
              </span>
            </ReviewType>
            <AuthorInfo>@{review.author_username}</AuthorInfo>
            <ReviewDetails>
              <DetailItem>
                <span>📅</span>
                <span>{formattedDate}</span>
              </DetailItem>
              <DetailItem>
                <span>🏷️</span>
                <span>{review.category}</span>
              </DetailItem>
              <DetailItem>
                <span>📍</span>
                <span>
                  {review.latitude.toFixed(4)}, {review.longitude.toFixed(4)}
                </span>
              </DetailItem>
            </ReviewDetails>
          </ReviewMeta>
        </ReviewHeader>

        <BadgesRow>
          {review.is_unique && (
            <Badge variant="unique">
              <span>✨</span> Уникальный
            </Badge>
          )}
          {review.has_media && (
            <Badge variant="media">
              <span>📷</span> С медиа
            </Badge>
          )}
        </BadgesRow>

        <Content>{review.content}</Content>

        {showComment && (
          <CommentInput
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Введите комментарий модератора (необязательно)..."
          />
        )}

        <ActionsRow>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleAction('approve')}
            disabled={isProcessing}
          >
            ✅ Подтвердить
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!showComment) {
                setShowComment(true);
              } else {
                handleAction('soft_reject');
              }
            }}
            disabled={isProcessing}
          >
            ⚠️ Неактуален
          </Button>
          <SpamButton
            variant="outline"
            size="sm"
            onClick={() => {
              if (!showComment) {
                setShowComment(true);
              } else {
                handleAction('spam_block');
              }
            }}
            disabled={isProcessing}
          >
            🚫 Спам
          </SpamButton>
          {showComment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowComment(false);
                setComment('');
              }}
            >
              Отмена
            </Button>
          )}
        </ActionsRow>
      </ReviewCard>
    </motion.div>
  );
};

