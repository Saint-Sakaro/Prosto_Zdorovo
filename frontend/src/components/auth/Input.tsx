import React from 'react';
import styled from 'styled-components';
import { theme } from '../../theme';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

const InputWrapper = styled.div<{ fullWidth?: boolean }>`
  width: ${({ fullWidth }) => (fullWidth ? '100%' : 'auto')};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StyledInput = styled.input<{ hasError?: boolean }>`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid
    ${({ theme, hasError }) =>
      hasError ? theme.colors.accent.error : theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-family: ${({ theme }) => theme.typography.fontFamily.main};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme, hasError }) =>
      hasError ? theme.colors.accent.error : theme.colors.primary.main};
    box-shadow: ${({ theme, hasError }) =>
      hasError
        ? `0 0 0 3px ${theme.colors.accent.error}20`
        : theme.shadows.glow};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.accent.error};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

export const Input: React.FC<InputProps> = ({
  label,
  error,
  fullWidth = true,
  ...props
}) => {
  return (
    <InputWrapper fullWidth={fullWidth}>
      {label && <Label htmlFor={props.id || props.name}>{label}</Label>}
      <StyledInput hasError={!!error} {...props} />
      {error && <ErrorText>{error}</ErrorText>}
    </InputWrapper>
  );
};

