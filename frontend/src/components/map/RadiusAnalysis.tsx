import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { theme } from '../../theme';

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

const ToggleButton = styled(Button)`
  min-width: auto;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
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

interface RadiusAnalysisProps {
  isActive: boolean;
  onToggle: (active: boolean) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  onAnalyze: () => void;
  center?: [number, number] | null;
  isAnalyzing: boolean;
}

export const RadiusAnalysis: React.FC<RadiusAnalysisProps> = ({
  isActive,
  onToggle,
  radius,
  onRadiusChange,
  onAnalyze,
  center,
  isAnalyzing,
}) => {
  const [localRadius, setLocalRadius] = useState(radius);

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

  if (!isActive) {
    return (
      <ControlPanel>
        <PanelHeader>
          <PanelTitle>Анализ по радиусу</PanelTitle>
          <ToggleButton
            variant="primary"
            size="sm"
            onClick={() => onToggle(true)}
          >
            Активировать
          </ToggleButton>
        </PanelHeader>
        <Instructions>
          Включите режим анализа по радиусу, чтобы выбрать точку на карте и
          проанализировать область вокруг неё.
        </Instructions>
      </ControlPanel>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ControlPanel>
      <PanelHeader>
        <PanelTitle>Анализ по радиусу</PanelTitle>
        <ToggleButton
          variant="outline"
          size="sm"
          onClick={() => onToggle(false)}
        >
          Отключить
        </ToggleButton>
      </PanelHeader>

      <Instructions>
        {center
          ? `📍 Центр: ${center[0].toFixed(4)}, ${center[1].toFixed(4)}`
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
          onClick={onAnalyze}
          disabled={!center || isAnalyzing}
          fullWidth
        >
          {isAnalyzing ? '⏳ Анализ...' : center ? '🔍 Проанализировать область' : 'Выберите точку на карте'}
        </Button>
      </ButtonRow>
      </ControlPanel>
    </motion.div>
  );
};

