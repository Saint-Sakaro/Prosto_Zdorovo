import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { theme } from '../../theme';

interface TransactionItemProps {
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  date: string;
  balanceAfter: number;
}

const TransactionCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
`;

const TransactionInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const TransactionType = styled.div<{ type: string }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ type, theme }) =>
    type === 'credit' ? theme.colors.accent.success : theme.colors.accent.error};
`;

const TransactionReason = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TransactionDate = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const TransactionAmount = styled.div<{ type: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ type, theme }) =>
    type === 'credit' ? theme.colors.accent.success : theme.colors.accent.error};
`;

const TypeIcon = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
`;

const reasonLabels: Record<string, string> = {
  unique_review_approved: 'Подтвержден уникальный отзыв',
  duplicate_review: 'Дубликат/подтверждение отзыва',
  incident_reported: 'Зафиксирован инцидент',
  media_attached: 'Прикреплено медиа',
  monthly_bonus: 'Месячный бонус',
  seasonal_activity: 'Сезонная активность',
  reward_purchase: 'Покупка награды',
  monthly_conversion: 'Конвертация в рейтинг',
  monthly_reset: 'Месячный сброс',
};

export const TransactionItem: React.FC<TransactionItemProps> = ({
  type,
  amount,
  reason,
  date,
  balanceAfter,
}) => {
  const formattedDate = new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <TransactionCard>
        <TransactionInfo>
          <TransactionType type={type}>
            <TypeIcon>{type === 'credit' ? '➕' : '➖'}</TypeIcon>
            {type === 'credit' ? 'Начисление' : 'Списание'}
          </TransactionType>
          <TransactionReason>
            {reasonLabels[reason] || reason}
          </TransactionReason>
          <TransactionDate>{formattedDate}</TransactionDate>
        </TransactionInfo>
        <TransactionAmount type={type}>
          {type === 'credit' ? '+' : '-'}
          {amount}
        </TransactionAmount>
      </TransactionCard>
    </motion.div>
  );
};

