import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { theme } from '../../theme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  gradient?: string;
  glow?: boolean;
  delay?: number;
}

const StatCardWrapper = styled(motion.div)`
  height: 100%;
`;

const StatCardContent = styled(Card)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  height: 100%;
`;

const IconWrapper = styled.div<{ gradient?: string }>`
  width: 80px;
  height: 80px;
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  background: ${({ gradient, theme }) =>
    gradient || theme.colors.primary.gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadows.glow};
  position: relative;
  overflow: hidden;

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

const Title = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Value = styled.div<{ gradient?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  background: ${({ gradient, theme }) =>
    gradient || theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
`;

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  gradient,
  glow = true,
  delay = 0,
}) => {
  return (
    <StatCardWrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <StatCardContent glow={glow}>
        <IconWrapper gradient={gradient}>
          <Icon>{icon}</Icon>
        </IconWrapper>
        <Title>{title}</Title>
        <Value gradient={gradient}>{value}</Value>
      </StatCardContent>
    </StatCardWrapper>
  );
};

