/**
 * API методы для работы с картами и POI
 */

import apiClient from './client';

export interface POICategory {
  uuid: string;
  name: string;
  slug: string;
  marker_color: string;
  health_weight: number;
  health_importance: number;
  display_order: number;
  is_active: boolean;
}

export interface POI {
  uuid: string;
  name: string;
  category_name: string;
  category_slug: string;
  address: string;
  latitude: number;
  longitude: number;
  marker_color: string;
  health_score: number;
}

export interface POIDetails {
  uuid: string;
  name: string;
  category: {
    name: string;
    slug: string;
    marker_color: string;
  };
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  phone?: string;
  website?: string;
  rating: {
    health_score: number;
    reviews_count: number;
    approved_reviews_count: number;
  };
}

export interface AnalysisRequest {
  analysis_type: 'radius' | 'city' | 'street';
  center_lat?: number;
  center_lon?: number;
  radius_meters?: number;
  sw_lat?: number;
  sw_lon?: number;
  ne_lat?: number;
  ne_lon?: number;
  category_filters?: string[];
}

export interface CategoryStat {
  name: string;
  count: number;
  average_health_score: number;
}

export interface AnalysisResult {
  health_index: number;
  health_interpretation: string;
  analysis_type: 'radius' | 'city' | 'street';
  area_name: string;
  category_stats: Record<string, CategoryStat>;
  objects: POI[];
  total_count: number;
  area_params: {
    center_lat?: number;
    center_lon?: number;
    radius_meters?: number;
    sw_lat?: number;
    sw_lon?: number;
    ne_lat?: number;
    ne_lon?: number;
  };
}

export interface GeocodeRequest {
  address: string;
}

export interface GeocodeResponse {
  latitude: number;
  longitude: number;
  formatted_address: string;
}

export interface ReverseGeocodeRequest {
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodeResponse {
  formatted_address: string;
  components: {
    city?: string;
    street?: string;
    district?: string;
    house?: string;
  };
}

export const mapsApi = {
  // Получение категорий POI
  getCategories: async (): Promise<POICategory[]> => {
    const response = await apiClient.get('/maps/categories/');
    return response.data;
  },

  // Получение POI для карты
  getPOIs: async (params?: {
    category?: string;
    categories?: string;
    bbox?: string;
  }): Promise<{ count: number; results: POI[] }> => {
    const response = await apiClient.get('/maps/pois/', { params });
    return response.data;
  },

  // Получение POI в bounding box
  getPOIsInBbox: async (params: {
    sw_lat: number;
    sw_lon: number;
    ne_lat: number;
    ne_lon: number;
    categories?: string;
  }): Promise<{ count: number; results: POI[] }> => {
    const response = await apiClient.get('/maps/pois/in-bbox/', { params });
    return response.data;
  },

  // Детали POI
  getPOIDetails: async (uuid: string): Promise<POIDetails> => {
    const response = await apiClient.get(`/maps/pois/${uuid}/`);
    return response.data;
  },

  // Анализ области
  analyzeArea: async (data: AnalysisRequest): Promise<AnalysisResult> => {
    const response = await apiClient.post('/maps/analyze/', data);
    return response.data;
  },

  // Геокодирование
  geocode: async (data: GeocodeRequest): Promise<GeocodeResponse> => {
    const response = await apiClient.post('/maps/geocode/', data);
    return response.data;
  },

  // Обратное геокодирование
  reverseGeocode: async (
    data: ReverseGeocodeRequest
  ): Promise<ReverseGeocodeResponse> => {
    const response = await apiClient.post('/maps/reverse-geocode/', data);
    return response.data;
  },
};

