import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../theme';

interface LeaderboardTabsProps {
  activeTab: 'global' | 'monthly';
  onTabChange: (tab: 'global' | 'monthly') => void;
}

const TabsWrapper = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  padding: ${({ theme }) => theme.spacing.sm};
`;

const Tab = styled(motion.button)<{ active: boolean }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme, active }) =>
    active
      ? theme.typography.fontWeight.bold
      : theme.typography.fontWeight.medium};
  color: ${({ theme, active }) =>
    active ? theme.colors.text.inverse : theme.colors.text.secondary};
  background: ${({ theme, active }) =>
    active ? theme.colors.primary.gradient : 'transparent'};
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    color: ${({ theme, active }) =>
      active ? theme.colors.text.inverse : theme.colors.text.primary};
    background: ${({ theme, active }) =>
      active
        ? theme.colors.primary.gradient
        : 'rgba(255, 255, 255, 0.05)'};
  }

  ${({ active, theme }) =>
    active &&
    `
    box-shadow: ${theme.shadows.glow};
  `}
`;

const TabIcon = styled.span`
  margin-right: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
`;

export const LeaderboardTabs: React.FC<LeaderboardTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <TabsWrapper>
      <Tab
        active={activeTab === 'global'}
        onClick={() => onTabChange('global')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <TabIcon>🌍</TabIcon>
        Глобальный рейтинг
      </Tab>
      <Tab
        active={activeTab === 'monthly'}
        onClick={() => onTabChange('monthly')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <TabIcon>📅</TabIcon>
        Месячный рейтинг
      </Tab>
    </TabsWrapper>
  );
};

