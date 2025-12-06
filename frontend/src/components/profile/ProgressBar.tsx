import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../theme';

interface ProgressBarProps {
  current: number;
  max: number;
  label?: string;
  gradient?: string;
  showPercentage?: boolean;
}

const ProgressWrapper = styled.div`
  width: 100%;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const ProgressLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ProgressValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.borderRadius.full};
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const ProgressBarFill = styled(motion.div)<{ gradient?: string }>`
  height: 100%;
  background: ${({ gradient, theme }) =>
    gradient || theme.colors.primary.gradient};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  position: relative;
  box-shadow: ${({ theme }) => theme.shadows.glow};

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  max,
  label,
  gradient,
  showPercentage = true,
}) => {
  const percentage = Math.min((current / max) * 100, 100);

  return (
    <ProgressWrapper>
      {(label || showPercentage) && (
        <ProgressHeader>
          {label && <ProgressLabel>{label}</ProgressLabel>}
          {showPercentage && (
            <ProgressValue>
              {current} / {max} ({Math.round(percentage)}%)
            </ProgressValue>
          )}
        </ProgressHeader>
      )}
      <ProgressBarContainer>
        <ProgressBarFill
          gradient={gradient}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </ProgressBarContainer>
    </ProgressWrapper>
  );
};

