import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../theme';

interface LeaderboardHeaderProps {
  type: 'global' | 'monthly';
  totalCount: number;
  currentUserPosition?: number;
}

const HeaderWrapper = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
`;

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StatsSection = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg};
  align-items: center;
`;

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  min-width: 120px;
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const PositionBadge = styled.div.withConfig({
  shouldForwardProp: (prop) => !['position'].includes(prop),
})<{ position?: number }>`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: ${({ theme, position }) => {
    if (!position) return theme.colors.background.card;
    if (position <= 3) return theme.colors.primary.gradient;
    return theme.colors.secondary.gradient;
  }};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme, position }) =>
    position && position <= 3
      ? theme.colors.text.inverse
      : theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  box-shadow: ${({ theme }) => theme.shadows.glow};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

export const LeaderboardHeader: React.FC<LeaderboardHeaderProps> = ({
  type,
  totalCount,
  currentUserPosition,
}) => {
  return (
    <HeaderWrapper
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <TitleSection>
        <Title>
          {type === 'global' ? 'Глобальный рейтинг' : 'Месячный рейтинг'}
        </Title>
        <Subtitle>
          {type === 'global'
            ? 'Общий рейтинг всех пользователей'
            : 'Рейтинг за текущий месяц'}
        </Subtitle>
      </TitleSection>

      <StatsSection>
        <StatCard>
          <StatValue>{totalCount}</StatValue>
          <StatLabel>Участников</StatLabel>
        </StatCard>
        {currentUserPosition && (
          <PositionBadge position={currentUserPosition}>
            <span>🏆</span>
            Ваше место: {currentUserPosition}
          </PositionBadge>
        )}
      </StatsSection>
    </HeaderWrapper>
  );
};

