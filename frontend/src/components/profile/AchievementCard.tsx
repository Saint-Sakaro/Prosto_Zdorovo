import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { theme } from '../../theme';

interface AchievementCardProps {
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon?: string;
  unlocked?: boolean;
  progress?: number;
}

const rarityColors = {
  common: theme.colors.rarity.common,
  rare: theme.colors.rarity.rare,
  epic: theme.colors.rarity.epic,
  legendary: theme.colors.rarity.legendary,
};

const rarityGradients = {
  common: 'linear-gradient(135deg, #94A3B8 0%, #CBD5E1 100%)',
  rare: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
  epic: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
  legendary: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
};

const AchievementCardWrapper = styled(motion.div)`
  height: 100%;
`;

const AchievementCardContent = styled(Card).withConfig({
  shouldForwardProp: (prop) => !['unlocked'].includes(prop),
})<{ unlocked: boolean }>`
  padding: ${({ theme }) => theme.spacing.lg};
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  opacity: ${({ unlocked }) => (unlocked ? 1 : 0.5)};

  ${({ unlocked }) =>
    !unlocked &&
    `
    filter: grayscale(100%);
  `}
`;

const IconWrapper = styled.div.withConfig({
  shouldForwardProp: (prop) => !['rarity', 'unlocked'].includes(prop),
})<{ rarity: string; unlocked: boolean }>`
  width: 80px;
  height: 80px;
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  background: ${({ rarity }) => rarityGradients[rarity as keyof typeof rarityGradients]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  box-shadow: ${({ rarity, theme }) =>
    `0 0 20px ${rarityColors[rarity as keyof typeof rarityColors]}40`};
  position: relative;
  border: 2px solid
    ${({ rarity }) => rarityColors[rarity as keyof typeof rarityColors]};

  ${({ unlocked }) =>
    unlocked &&
    `
    &::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(
        circle,
        rgba(255, 255, 255, 0.3) 0%,
        transparent 70%
      );
      animation: rotate 3s linear infinite;
    }
  `}

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const Icon = styled.span`
  position: relative;
  z-index: 1;
`;

const Name = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const RarityBadge = styled.span.withConfig({
  shouldForwardProp: (prop) => !['rarity'].includes(prop),
})<{ rarity: string }>`
  display: inline-block;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ rarity }) =>
    rarityColors[rarity as keyof typeof rarityColors]}20;
  color: ${({ rarity }) => rarityColors[rarity as keyof typeof rarityColors]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid
    ${({ rarity }) => rarityColors[rarity as keyof typeof rarityColors]};
`;

const ProgressWrapper = styled.div`
  width: 100%;
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const ProgressText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

export const AchievementCard: React.FC<AchievementCardProps> = ({
  name,
  description,
  rarity,
  icon = '🏆',
  unlocked = true,
  progress,
}) => {
  return (
    <AchievementCardWrapper
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <AchievementCardContent unlocked={unlocked}>
        <IconWrapper rarity={rarity} unlocked={unlocked}>
          <Icon>{icon}</Icon>
        </IconWrapper>
        <Name>{name}</Name>
        <Description>{description}</Description>
        <RarityBadge rarity={rarity}>{rarity}</RarityBadge>
        {progress !== undefined && progress < 100 && (
          <ProgressWrapper>
            <ProgressText>Прогресс: {progress}%</ProgressText>
          </ProgressWrapper>
        )}
      </AchievementCardContent>
    </AchievementCardWrapper>
  );
};

