import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  hover?: boolean;
  glow?: boolean;
  padding?: string;
  onClick?: () => void;
}

const StyledCard = styled(motion.div).withConfig({
  shouldForwardProp: (prop) => !['hover', 'glow'].includes(prop),
})<CardProps>`
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  padding: ${({ padding, theme }) => padding || theme.spacing.lg};
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  ${({ glow, theme }) =>
    glow &&
    `
    box-shadow: ${theme.shadows.glow};
    border-color: ${theme.colors.border.accent};
  `}

  ${({ hover, theme }) =>
    hover &&
    `
    cursor: pointer;
    
    &:hover {
      background: ${theme.colors.background.cardHover};
      transform: translateY(-4px);
      box-shadow: ${theme.shadows.xl}, ${theme.shadows.glow};
      border-color: ${theme.colors.primary.main};
    }
  `}

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${({ theme }) => theme.colors.primary.gradient};
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  ${({ hover }) =>
    hover &&
    `
    &:hover::before {
      opacity: 1;
    }
  `}
`;

export const Card: React.FC<CardProps> = ({
  children,
  hover = false,
  glow = false,
  padding,
  onClick,
  ...props
}) => {
  return (
    <StyledCard
      hover={hover}
      glow={glow}
      padding={padding}
      onClick={onClick}
      whileHover={hover ? { scale: 1.02 } : {}}
      whileTap={hover ? { scale: 0.98 } : {}}
      {...props}
    >
      {children}
    </StyledCard>
  );
};

