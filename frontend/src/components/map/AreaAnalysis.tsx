import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { theme } from '../../theme';
import { ZOOM_THRESHOLDS } from '../../types/maps';

const ControlPanel = styled(Card)`
  position: absolute;
  bottom: ${({ theme }) => theme.spacing.lg};
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  min-width: 300px;
  max-width: 500px;
  width: 90%;

  @media (max-width: 768px) {
    width: calc(100% - ${({ theme }) => theme.spacing.xl});
    left: ${({ theme }) => theme.spacing.md};
    right: ${({ theme }) => theme.spacing.md};
    transform: none;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const PanelTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const AnalysisMode = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary.main}20;
  border: 1px solid ${({ theme }) => theme.colors.primary.main};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.primary.main};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Instructions = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background.card};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ZoomInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: ${({ theme }) => theme.spacing.sm};
  text-align: center;
`;

interface AreaAnalysisProps {
  currentZoom: number;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onSwitchToRadius?: () => void;
}

export const AreaAnalysis: React.FC<AreaAnalysisProps> = ({
  currentZoom,
  onAnalyze,
  isAnalyzing,
  onSwitchToRadius,
}) => {
  // Определяем режим анализа на основе зума
  const getAnalysisMode = (): 'city' | 'street' | null => {
    if (currentZoom >= ZOOM_THRESHOLDS.CITY_MIN && currentZoom <= ZOOM_THRESHOLDS.CITY_MAX) {
      return 'city';
    }
    if (currentZoom >= ZOOM_THRESHOLDS.STREET_MIN) {
      return 'street';
    }
    return null;
  };

  const analysisMode = getAnalysisMode();

  if (!analysisMode) {
    return (
      <ControlPanel>
        <PanelHeader>
          <PanelTitle>Анализ области</PanelTitle>
        </PanelHeader>
        <Instructions>
          Измените масштаб карты для активации режима анализа:
          <br />
          • Zoom 10-12: Анализ по городу/округу
          <br />
          • Zoom 15+: Анализ по улице/кварталу
        </Instructions>
        <ZoomInfo>Текущий zoom: {currentZoom.toFixed(1)}</ZoomInfo>
      </ControlPanel>
    );
  }

  const modeLabel = analysisMode === 'city' ? 'Город/Округ' : 'Улица/Квартал';
  const modeIcon = analysisMode === 'city' ? '🏙️' : '🏘️';
  const modeDescription =
    analysisMode === 'city'
      ? 'Анализ будет выполнен для всей видимой области карты (город/округ)'
      : 'Анализ будет выполнен для текущей видимой области (улица/квартал)';

  return (
    <ControlPanel
      as={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PanelHeader>
        <PanelTitle>Анализ области</PanelTitle>
        {onSwitchToRadius && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSwitchToRadius}
          >
          Режим радиуса
          </Button>
        )}
      </PanelHeader>

      <AnalysisMode>
        <span>{modeIcon}</span>
        <span>Режим: {modeLabel}</span>
      </AnalysisMode>

      <Instructions>{modeDescription}</Instructions>

      <ButtonRow>
        <Button
          variant="primary"
          size="md"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          fullWidth
        >
          {isAnalyzing ? '⏳ Анализ...' : '🔍 Проанализировать область'}
        </Button>
      </ButtonRow>

      <ZoomInfo>Текущий zoom: {currentZoom.toFixed(1)}</ZoomInfo>
    </ControlPanel>
  );
};

