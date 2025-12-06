/**
 * TypeScript типы для модуля карт
 */

export interface MapState {
  center: [number, number];
  zoom: number;
  bounds: {
    sw: [number, number];
    ne: [number, number];
  };
}

export interface MapConfig {
  center: [number, number];
  zoom: number;
  controls: string[];
}

export const ZOOM_THRESHOLDS = {
  CITY_MIN: 10,
  CITY_MAX: 12,
  STREET_MIN: 15,
} as const;

export type AnalysisMode = 'radius' | 'city' | 'street' | null;

