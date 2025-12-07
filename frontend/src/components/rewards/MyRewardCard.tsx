import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { UserReward } from '../../api/gamification';
import { theme } from '../../theme';

interface MyRewardCardProps {
  userReward: UserReward;
}

const RewardCardWrapper = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
`;

const RewardImage = styled.div<{ imageUrl?: string }>`
  width: 100%;
  height: 150px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ imageUrl, theme }) =>
    imageUrl
      ? `url(${imageUrl}) center/cover`
      : theme.colors.primary.gradient};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  position: relative;
  overflow: hidden;
`;

const StatusBadge = styled.div.withConfig({
  shouldForwardProp: (prop) => !['status'].includes(prop),
})<{ status: string }>`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md};
  right: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  z-index: 1;

  ${({ status, theme }) => {
    switch (status) {
      case 'active':
        return `
          color: ${theme.colors.accent.success};
          border-color: ${theme.colors.accent.success};
        `;
      case 'used':
        return `
          color: ${theme.colors.text.muted};
          border-color: ${theme.colors.text.muted};
        `;
      case 'expired':
        return `
          color: ${theme.colors.accent.error};
          border-color: ${theme.colors.accent.error};
        `;
      default:
        return `color: ${theme.colors.text.primary};`;
    }
  }}
`;

const RewardName = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const RewardFooter = styled.div`
  margin-top: auto;
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border.main};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const statusLabels = {
  active: 'Активна',
  used: 'Использована',
  expired: 'Истекла',
};

export const MyRewardCard: React.FC<MyRewardCardProps> = ({ userReward }) => {
  const formattedDate = new Date(userReward.created_at).toLocaleDateString(
    'ru-RU',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <RewardCardWrapper hover>
        <RewardImage imageUrl={userReward.reward_image || undefined}>
          {!userReward.reward_image && <span>🎁</span>}
        </RewardImage>

        <StatusBadge status={userReward.status}>
          {statusLabels[userReward.status] || userReward.status}
        </StatusBadge>

        <RewardName>{userReward.reward_name}</RewardName>

        <RewardFooter>
          Получена: {formattedDate}
          {userReward.used_at && (
            <div style={{ marginTop: theme.spacing.xs }}>
              Использована:{' '}
              {new Date(userReward.used_at).toLocaleDateString('ru-RU')}
            </div>
          )}
        </RewardFooter>
      </RewardCardWrapper>
    </motion.div>
  );
};

