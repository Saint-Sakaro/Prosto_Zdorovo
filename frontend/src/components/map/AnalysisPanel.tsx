import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { theme } from '../../theme';
import { ZOOM_THRESHOLDS } from '../../types/maps';

const ControlPanel = styled(Card)`
  position: relative;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  width: 100%;
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  box-shadow: ${({ theme }) => theme.shadows.md};
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
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ModeTabs = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.xs};
  background: ${({ theme }) => theme.colors.background.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
`;

const TabButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme, active }) =>
    active ? theme.colors.primary.main : 'transparent'};
  color: ${({ theme, active }) =>
    active ? '#FFFFFF' : theme.colors.text.secondary};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme, active }) =>
    active
      ? theme.typography.fontWeight.semibold
      : theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xs};

  &:hover {
    background: ${({ theme, active }) =>
      active
        ? theme.colors.primary.main
        : theme.colors.background.card};
    color: ${({ theme, active }) =>
      active ? '#FFFFFF' : theme.colors.text.primary};
  }

  @media (max-width: 480px) {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  }
`;

const ContentArea = styled.div`
  position: relative;
`;

const AnalysisMode = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary.main}20 0%, ${({ theme }) => theme.colors.secondary.main}20 100%);
  border: 1px solid ${({ theme }) => theme.colors.primary.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.primary.main};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const Instructions = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.main};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const SliderContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const SliderLabel = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const SliderWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Slider = styled.input.attrs({ type: 'range' })`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.background.card};
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary.main};
    cursor: pointer;
    box-shadow: ${({ theme }) => theme.shadows.md};
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.1);
      box-shadow: ${({ theme }) => theme.shadows.lg};
    }
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary.main};
    cursor: pointer;
    border: none;
    box-shadow: ${({ theme }) => theme.shadows.md};
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.1);
      box-shadow: ${({ theme }) => theme.shadows.lg};
    }
  }
`;

const RadiusValue = styled.div`
  min-width: 80px;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary.main}20;
  border: 1px solid ${({ theme }) => theme.colors.primary.main};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.primary.main};
  text-align: center;

  @media (max-width: 480px) {
    min-width: 60px;
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  }
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

type AnalysisMode = 'area' | 'radius';

interface AnalysisPanelProps {
  currentZoom: number;
  // Режим области
  onAreaAnalyze: () => void;
  // Режим радиуса
  radius: number;
  onRadiusChange: (radius: number) => void;
  onRadiusAnalyze: () => void;
  radiusCenter: [number, number] | null;
  onMapClick?: (e: any) => void;
  // Общее
  isAnalyzing: boolean;
  activeMode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  currentZoom,
  onAreaAnalyze,
  radius,
  onRadiusChange,
  onRadiusAnalyze,
  radiusCenter,
  onMapClick,
  isAnalyzing,
  activeMode,
  onModeChange,
}) => {
  const [localRadius, setLocalRadius] = useState(radius);

  // Определяем режим анализа области на основе зума
  const getAreaAnalysisMode = (): 'city' | 'street' | null => {
    if (
      currentZoom >= ZOOM_THRESHOLDS.CITY_MIN &&
      currentZoom <= ZOOM_THRESHOLDS.CITY_MAX
    ) {
      return 'city';
    }
    if (currentZoom >= ZOOM_THRESHOLDS.STREET_MIN) {
      return 'street';
    }
    return null;
  };

  const areaMode = getAreaAnalysisMode();

  const handleRadiusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newRadius = parseInt(e.target.value, 10);
      setLocalRadius(newRadius);
      onRadiusChange(newRadius);
    },
    [onRadiusChange]
  );

  const formatRadius = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} км`;
    }
    return `${meters} м`;
  };

  // Обработчик клика по карте для режима радиуса
  React.useEffect(() => {
    if (activeMode === 'radius') {
      // Включаем обработчик клика по карте
      // Это будет обрабатываться в MapContainer через onMapClick
    }
  }, [activeMode]);

  return (
    <ControlPanel
      as={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PanelHeader>
        <PanelTitle>
          <span>🔍</span>
          <span>Анализ области</span>
        </PanelTitle>
      </PanelHeader>

      <ModeTabs>
        <TabButton
          active={activeMode === 'area'}
          onClick={() => onModeChange('area')}
        >
          <span>🏙️</span>
          <span>Область</span>
        </TabButton>
        <TabButton
          active={activeMode === 'radius'}
          onClick={() => onModeChange('radius')}
        >
          <span>📍</span>
          <span>Радиус</span>
        </TabButton>
      </ModeTabs>

      <ContentArea>
        <AnimatePresence mode="wait">
          {activeMode === 'area' ? (
            <motion.div
              key="area"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {!areaMode ? (
                <>
                  <Instructions>
                    Измените масштаб карты для активации режима анализа:
                    <br />
                    • Zoom 10-12: Анализ по городу/округу
                    <br />
                    • Zoom 15+: Анализ по улице/кварталу
                  </Instructions>
                  <ZoomInfo>Текущий zoom: {currentZoom.toFixed(1)}</ZoomInfo>
                </>
              ) : (
                <>
                  <AnalysisMode>
                    <span>
                      {areaMode === 'city' ? '🏙️' : '🏘️'}
                    </span>
                    <span>
                      Режим:{' '}
                      {areaMode === 'city' ? 'Город/Округ' : 'Улица/Квартал'}
                    </span>
                  </AnalysisMode>
                  <Instructions>
                    {areaMode === 'city'
                      ? 'Анализ будет выполнен для всей видимой области карты (город/округ)'
                      : 'Анализ будет выполнен для текущей видимой области (улица/квартал)'}
                  </Instructions>
                  <ButtonRow>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={onAreaAnalyze}
                      disabled={isAnalyzing}
                      fullWidth
                    >
                      {isAnalyzing
                        ? '⏳ Анализ...'
                        : '🔍 Проанализировать область'}
                    </Button>
                  </ButtonRow>
                  <ZoomInfo>Текущий zoom: {currentZoom.toFixed(1)}</ZoomInfo>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="radius"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Instructions>
                {radiusCenter
                  ? `📍 Центр: ${radiusCenter[0].toFixed(4)}, ${radiusCenter[1].toFixed(4)}`
                  : '👆 Кликните на карте, чтобы выбрать центр анализа'}
              </Instructions>

              <SliderContainer>
                <SliderLabel>Радиус анализа</SliderLabel>
                <SliderWrapper>
                  <Slider
                    min={100}
                    max={5000}
                    step={100}
                    value={localRadius}
                    onChange={handleRadiusChange}
                  />
                  <RadiusValue>{formatRadius(localRadius)}</RadiusValue>
                </SliderWrapper>
              </SliderContainer>

              <ButtonRow>
                <Button
                  variant="primary"
                  size="md"
                  onClick={onRadiusAnalyze}
                  disabled={!radiusCenter || isAnalyzing}
                  fullWidth
                >
                  {isAnalyzing
                    ? '⏳ Анализ...'
                    : radiusCenter
                    ? '🔍 Проанализировать область'
                    : 'Выберите точку на карте'}
                </Button>
              </ButtonRow>
            </motion.div>
          )}
        </AnimatePresence>
      </ContentArea>
    </ControlPanel>
  );
};

