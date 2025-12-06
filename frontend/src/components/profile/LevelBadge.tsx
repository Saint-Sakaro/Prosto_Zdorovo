import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../theme';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
}

const BadgeWrapper = styled(motion.div)<{ size: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ theme }) => theme.colors.primary.gradient};
  box-shadow: ${({ theme }) => theme.shadows.glow};
  position: relative;
  overflow: hidden;

  ${({ size }) => {
    switch (size) {
      case 'sm':
        return `
          width: 60px;
          height: 60px;
          font-size: ${theme.typography.fontSize.xl};
        `;
      case 'lg':
        return `
          width: 120px;
          height: 120px;
          font-size: ${theme.typography.fontSize['5xl']};
        `;
      default:
        return `
          width: 80px;
          height: 80px;
          font-size: ${theme.typography.fontSize['2xl']};
        `;
    }
  }}

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.2) 0%,
      transparent 70%
    );
    animation: rotate 4s linear infinite;
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const LevelText = styled.span`
  position: relative;
  z-index: 1;
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  color: ${({ theme }) => theme.colors.text.inverse};
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const LevelLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing.xs};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  size = 'md',
}) => {
  return (
    <Container>
      <BadgeWrapper
        size={size}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
        }}
      >
        <LevelText>{level}</LevelText>
      </BadgeWrapper>
      <LevelLabel>Уровень</LevelLabel>
    </Container>
  );
};

