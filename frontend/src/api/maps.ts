/**
 * API методы для работы с картами и POI
 */

import apiClient from './client';

export interface POICategory {
  uuid: string;
  name: string;
  marker_color: string;
  display_order: number;
  is_active: boolean;
}

export interface POI {
  uuid: string;
  name: string;
  category_name: string;
  category_uuid: string;
  address: string;
  latitude: number;
  longitude: number;
  marker_color: string;
  health_score: number;
  // ⬇️ НОВЫЕ ПОЛЯ (опционально, если не заполнено)
  form_data?: Record<string, any>;  // Данные анкеты
  verified?: boolean;                // Верифицирован ли объект
  form_schema?: string;              // UUID схемы анкеты
}

export interface POIDetails {
  uuid: string;
  name: string;
  category: {
    uuid: string;
    name: string;
    marker_color: string;
  };
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  phone?: string;
  website?: string;
  // ⬇️ НОВЫЕ ПОЛЯ
  form_data?: Record<string, any>;
  verified?: boolean;
  verified_by?: number | null;
  verified_at?: string | null;
  form_schema?: string;
  rating: {
    health_score: number;
    reviews_count: number;
    approved_reviews_count: number;
    // ⬇️ НОВЫЕ ПОЛЯ рейтинга
    S_infra?: number;      // Инфраструктурный рейтинг (0-100)
    S_social?: number;     // Социальный рейтинг (0-100)
    S_HIS?: number;        // Health Impact Score (0-100)
    last_infra_calculation?: string;
    last_social_calculation?: string;
    calculation_metadata?: Record<string, any>;
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

// ⬇️ НОВЫЕ ТИПЫ ДЛЯ АНКЕТ И РЕЙТИНГОВ

export interface FormField {
  id: string;
  type: 'boolean' | 'range' | 'select' | 'photo' | 'text';
  label: string;
  description?: string;
  direction: 1 | -1;  // +1 полезный, -1 вредный
  weight: number;
  required?: boolean;  // Обязательное поле
  scale_min?: number;  // для range
  scale_max?: number;  // для range
  options?: string[];  // для select
  mapping?: Record<string, number>;  // для select
}

export interface FormSchema {
  uuid: string;
  category: number;  // ID категории
  category_name: string;
  name: string;
  schema_json: {
    fields: FormField[];
    version?: string;
  };
  version: string;
  generated_by_llm: boolean;
  llm_prompt?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'archived';
  approved_by?: number | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface POIRatingDetails {
  uuid: string;
  poi: string;  // UUID POI
  poi_name: string;
  poi_category: string;
  S_infra: number;
  S_social: number;
  S_HIS: number;
  health_score: number;  // Алиас для S_HIS (для обратной совместимости)
  reviews_count: number;
  approved_reviews_count: number;
  last_infra_calculation: string | null;
  last_social_calculation: string | null;
  calculation_metadata: Record<string, any>;
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

  // Создание POI
  createPOI: async (data: {
    name: string;
    category: string; // slug категории
    address: string;
    latitude: number;
    longitude: number;
    description?: string;
    phone?: string;
    website?: string;
  }): Promise<POIDetails> => {
    const response = await apiClient.post('/maps/pois/', {
      name: data.name,
      category_uuid: data.category, // Используем category_uuid для создания
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description,
      phone: data.phone,
      website: data.website,
    });
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

// ⬇️ НОВЫЕ API МЕТОДЫ ДЛЯ АНКЕТ И РЕЙТИНГОВ

export const ratingsApi = {
  // Получение схем анкет
  getFormSchemas: async (params?: {
    category?: string;  // slug категории
  }): Promise<{ count: number; results: FormSchema[] }> => {
    const response = await apiClient.get('/maps/ratings/form-schemas/', { params });
    return response.data;
  },

  // Получение схемы по ID
  getFormSchema: async (uuid: string): Promise<FormSchema> => {
    const response = await apiClient.get(`/maps/ratings/form-schemas/${uuid}/`);
    return response.data;
  },

  // Генерация схемы через LLM
  generateFormSchema: async (data: {
    category_id: number;
    category_description?: string;
  }): Promise<FormSchema> => {
    const response = await apiClient.post(
      '/maps/ratings/form-schemas/generate-for-category/',
      data
    );
    return response.data;
  },

  // Обновление данных анкеты объекта
  updatePOIFormData: async (
    poiUuid: string,
    formData: Record<string, any>
  ): Promise<POIDetails> => {
    const response = await apiClient.put(
      `/maps/ratings/pois/${poiUuid}/form-data/`,
      { form_data: formData }
    );
    return response.data;
  },

  // Получение рейтинга объекта
  getPOIRating: async (ratingId: number): Promise<POIRatingDetails> => {
    const response = await apiClient.get(`/maps/ratings/ratings/${ratingId}/`);
    return response.data;
  },

  // Пересчет рейтинга (для админов)
  recalculateRating: async (ratingId: number): Promise<POIRatingDetails> => {
    const response = await apiClient.post(`/maps/ratings/ratings/${ratingId}/recalculate/`);
    return response.data;
  },
};

