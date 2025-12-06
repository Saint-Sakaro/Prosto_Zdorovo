import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { AnalysisResult } from '../../api/maps';
import { theme } from '../../theme';

const ResultsPanel = styled(Card)`
  position: absolute;
  top: ${({ theme }) => theme.spacing.lg};
  right: ${({ theme }) => theme.spacing.lg};
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  min-width: 320px;
  max-width: 400px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;

  @media (max-width: 768px) {
    position: fixed;
    top: auto;
    bottom: ${({ theme }) => theme.spacing.lg};
    right: ${({ theme }) => theme.spacing.md};
    left: ${({ theme }) => theme.spacing.md};
    max-width: none;
    max-height: 50vh;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding-bottom: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.main};
`;

const PanelTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  padding: ${({ theme }) => theme.spacing.xs};
  transition: all 0.2s ease;
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const HealthIndex = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background.card};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 2px solid ${({ theme }) => theme.colors.border.main};
`;

const IndexValue = styled.div<{ score: number }>`
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  color: ${({ theme, score }) => {
    if (score >= 80) return theme.colors.accent.success;
    if (score >= 60) return theme.colors.accent.warning;
    return theme.colors.accent.error;
  }};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const IndexLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const Interpretation = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const AreaName = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

const StatsSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const StatsTitle = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const CategoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const CategoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background.card};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
`;

const CategoryName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const CategoryStats = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const TotalCount = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary.main}20;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

interface AnalysisResultsProps {
  result: AnalysisResult | null;
  onClose: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  result,
  onClose,
}) => {
  if (!result) return null;

  const categoryStats = Object.entries(result.category_stats || {});

  return (
    <AnimatePresence>
      <ResultsPanel
        as={motion.div}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
      >
        <PanelHeader>
          <PanelTitle>Результаты анализа</PanelTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </PanelHeader>

        <HealthIndex>
          <IndexLabel>Индекс здоровья</IndexLabel>
          <IndexValue score={result.health_index}>
            {result.health_index.toFixed(1)}
          </IndexValue>
          <Interpretation>{result.health_interpretation}</Interpretation>
        </HealthIndex>

        {result.area_name && (
          <AreaName>📍 {result.area_name}</AreaName>
        )}

        {categoryStats.length > 0 && (
          <StatsSection>
            <StatsTitle>Статистика по категориям</StatsTitle>
            <CategoryList>
              {categoryStats.map(([slug, stat]) => (
                <CategoryItem key={slug}>
                  <CategoryName>{stat.name}</CategoryName>
                  <CategoryStats>
                    <span>{stat.count} объектов</span>
                    <span>•</span>
                    <span>{stat.average_health_score.toFixed(1)}</span>
                  </CategoryStats>
                </CategoryItem>
              ))}
            </CategoryList>
          </StatsSection>
        )}

        <TotalCount>
          Всего объектов в анализе: {result.total_count}
        </TotalCount>
      </ResultsPanel>
    </AnimatePresence>
  );
};

