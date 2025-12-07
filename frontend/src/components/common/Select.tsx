import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../theme';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  fullWidth?: boolean;
  required?: boolean;
}

const SelectWrapper = styled.div.withConfig({
  shouldForwardProp: (prop) => !['fullWidth'].includes(prop),
})<{ fullWidth?: boolean }>`
  width: ${({ fullWidth }) => (fullWidth ? '100%' : 'auto')};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  position: relative;
  z-index: 1;
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SelectButton = styled(motion.button).withConfig({
  shouldForwardProp: (prop) => !['hasError', 'isOpen'].includes(prop),
})<{ hasError?: boolean; isOpen: boolean }>`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid
    ${({ theme, hasError, isOpen }) =>
      hasError
        ? theme.colors.accent.error
        : isOpen
        ? theme.colors.primary.main
        : theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-family: ${({ theme }) => theme.typography.fontFamily.main};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};

  &:hover {
    border-color: ${({ theme, hasError }) =>
      hasError ? theme.colors.accent.error : theme.colors.primary.main};
    background: ${({ theme }) => theme.colors.background.cardHover};
  }

  ${({ isOpen, theme, hasError }) =>
    isOpen &&
    `
    box-shadow: ${hasError ? `0 0 0 3px ${theme.colors.accent.error}20` : theme.shadows.glow};
  `}
`;

const SelectValue = styled.span<{ $placeholder?: boolean }>`
  flex: 1;
  color: ${({ theme, $placeholder }) =>
    $placeholder ? theme.colors.text.muted : theme.colors.text.primary};
`;

const SelectIcon = styled(motion.span)`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.primary.main};
  display: flex;
  align-items: center;
`;

const Dropdown = styled(motion.div)<{ top: number; left: number; width: number }>`
  position: fixed;
  top: ${({ top }) => top}px;
  left: ${({ left }) => left}px;
  width: ${({ width }) => width}px;
  z-index: 9999;
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.xl};
  max-height: 300px;
  overflow-y: auto;
  overflow-x: hidden;
`;

const Option = styled(motion.button)<{ isSelected: boolean }>`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme, isSelected }) =>
    isSelected
      ? `${theme.colors.primary.main}20`
      : 'transparent'};
  border: none;
  color: ${({ theme, isSelected }) =>
    isSelected ? theme.colors.primary.main : theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-family: ${({ theme }) => theme.typography.fontFamily.main};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};

  &:hover {
    background: ${({ theme }) => `${theme.colors.primary.main}10`};
    color: ${({ theme }) => theme.colors.primary.main};
  }

  &:first-child {
    border-radius: ${({ theme }) => `${theme.borderRadius.lg} ${theme.borderRadius.lg} 0 0`};
  }

  &:last-child {
    border-radius: ${({ theme }) => `0 0 ${theme.borderRadius.lg} ${theme.borderRadius.lg}`};
  }

  &:only-child {
    border-radius: ${({ theme }) => theme.borderRadius.lg};
  }
`;

const OptionIcon = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.primary.main};
`;

const ErrorText = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.accent.error};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
  background: transparent;
`;

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Выберите...',
  error,
  fullWidth = true,
  required,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (newIsOpen) {
      // Небольшая задержка для правильного вычисления позиции после открытия
      setTimeout(() => {
        updateDropdownPosition();
      }, 10);
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        selectRef.current &&
        !selectRef.current.contains(target) &&
        !target.closest('[data-select-dropdown]')
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Небольшая задержка для правильного вычисления позиции
      setTimeout(() => {
        updateDropdownPosition();
      }, 0);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      updateDropdownPosition();
    };

    const handleScroll = () => {
      updateDropdownPosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <SelectWrapper ref={selectRef} fullWidth={fullWidth}>
      {label && (
        <Label>
          {label}
          {required && <span style={{ color: theme.colors.accent.error }}> *</span>}
        </Label>
      )}
      <SelectButton
        ref={buttonRef}
        type="button"
        hasError={!!error}
        isOpen={isOpen}
        onClick={handleToggle}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <SelectValue $placeholder={!selectedOption}>
          {selectedOption ? selectedOption.label : placeholder}
        </SelectValue>
        <SelectIcon
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </SelectIcon>
      </SelectButton>

      {typeof document !== 'undefined' &&
        isOpen &&
        createPortal(
          <AnimatePresence>
            <Overlay
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            {dropdownPosition.width > 0 && (
              <Dropdown
                key="dropdown"
                data-select-dropdown
                top={dropdownPosition.top}
                left={dropdownPosition.left}
                width={dropdownPosition.width}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {options.map((option, index) => (
                  <Option
                    key={option.value}
                    isSelected={option.value === value}
                    onClick={() => handleSelect(option.value)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    whileHover={{ x: 4 }}
                  >
                    {option.value === value && (
                      <OptionIcon>✓</OptionIcon>
                    )}
                    {option.label}
                  </Option>
                ))}
              </Dropdown>
            )}
          </AnimatePresence>,
          document.body
        )}

      {error && <ErrorText>{error}</ErrorText>}
    </SelectWrapper>
  );
};

