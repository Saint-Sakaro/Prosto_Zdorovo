import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../theme';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  to?: string;
  as?: React.ElementType;
}

const StyledButton = styled(motion.button)<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ size, theme }) => {
    switch (size) {
      case 'sm':
        return `${theme.spacing.sm} ${theme.spacing.md}`;
      case 'lg':
        return `${theme.spacing.md} ${theme.spacing.xl}`;
      default:
        return `${theme.spacing.md} ${theme.spacing.lg}`;
    }
  }};
  font-size: ${({ size, theme }) => {
    switch (size) {
      case 'sm':
        return theme.typography.fontSize.sm;
      case 'lg':
        return theme.typography.fontSize.lg;
      default:
        return theme.typography.fontSize.base;
    }
  }};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  width: ${({ fullWidth }) => (fullWidth ? '100%' : 'auto')};
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  ${({ variant, theme }) => {
    switch (variant) {
      case 'primary':
        return `
          background: ${theme.colors.primary.gradient};
          color: ${theme.colors.text.inverse};
          box-shadow: ${theme.shadows.glow};
          
          &:hover:not(:disabled) {
            box-shadow: ${theme.shadows.glowStrong};
            transform: translateY(-2px);
          }
        `;
      case 'secondary':
        return `
          background: ${theme.colors.secondary.gradient};
          color: ${theme.colors.text.primary};
          
          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: ${theme.shadows.lg};
          }
        `;
      case 'outline':
        return `
          background: transparent;
          color: ${theme.colors.primary.main};
          border: 2px solid ${theme.colors.primary.main};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.primary.main};
            color: ${theme.colors.text.inverse};
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: ${theme.colors.text.primary};
          
          &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
          }
        `;
      default:
        return '';
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  &:active:not(:disabled)::before {
    width: 300px;
    height: 300px;
  }
`;

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  onClick,
  disabled = false,
  type = 'button',
  to,
  ...props
}) => {
  const motionProps = {
    whileHover: { scale: disabled ? 1 : 1.02 },
    whileTap: { scale: disabled ? 1 : 0.98 },
  };

  if (to) {
    return (
      <StyledButton
        as={Link}
        to={to}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        onClick={onClick}
        disabled={disabled}
        {...motionProps}
        {...props}
      >
        {children}
      </StyledButton>
    );
  }

  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      onClick={onClick}
      disabled={disabled}
      type={type}
      {...motionProps}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

