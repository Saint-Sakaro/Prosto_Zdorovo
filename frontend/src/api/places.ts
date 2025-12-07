/**
 * API функции для работы с местами (POI submissions)
 * Этап 1: Ручное создание места пользователем
 */

import apiClient from './client';
import { POICategory, FormSchema } from './maps';

// Типы данных
export interface FormField {
  id: string;
  type: 'boolean' | 'range' | 'select' | 'text' | 'photo';
  label: string;
  description?: string;
  direction: 1 | -1; // +1 полезный, -1 вредный
  weight: number;
  required?: boolean; // Обязательное поле
  scale_min?: number; // для range
  scale_max?: number; // для range
  mapping?: Record<string, number>; // для select
  options?: string[]; // для select
}

export interface PlaceSubmissionData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category_slug: string;
  form_data: Record<string, any>;
  description?: string;
}

export interface PlaceSubmission {
  uuid: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: POICategory;
  category_slug: string;
  form_data: Record<string, any>;
  description?: string;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  llm_verdict?: {
    verdict: 'approve' | 'reject' | 'request_changes';
    comment: string;
    confidence: number;
    analysis?: {
      field_quality: string;
      health_impact: string;
      data_completeness: number;
    };
  };
  submitted_by: {
    id: number;
    username: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

// Получить список категорий
export const getCategories = async (): Promise<POICategory[]> => {
  const response = await apiClient.get('/maps/categories/');
  const data = response.data;
  // Обрабатываем разные форматы ответа
  return Array.isArray(data) ? data : (data.results || data.data || []);
};

// Получить схему формы для категории
export const getCategorySchema = async (categorySlug: string): Promise<FormSchema> => {
  const response = await apiClient.get(`/maps/categories/${categorySlug}/schema/`);
  return response.data;
};

// Создать заявку на место
export const createPlaceSubmission = async (data: PlaceSubmissionData): Promise<PlaceSubmission> => {
  const response = await apiClient.post('/maps/pois/submit/', data);
  return response.data;
};

// Получить список заявок пользователя
export const getMySubmissions = async (): Promise<PlaceSubmission[]> => {
  const response = await apiClient.get('/maps/pois/submissions/');
  const data = response.data;
  return Array.isArray(data) ? data : (data.results || []);
};

// Получить детали заявки
export const getSubmissionDetails = async (uuid: string): Promise<PlaceSubmission> => {
  const response = await apiClient.get(`/maps/pois/submissions/${uuid}/`);
  return response.data;
};

// Геокодирование адреса
export const geocodeAddress = async (address: string): Promise<{
  latitude: number;
  longitude: number;
  formatted_address: string;
}> => {
  const response = await apiClient.post('/maps/geocode/', { address });
  return response.data;
};

// Обратное геокодирование
export const reverseGeocode = async (lat: number, lng: number): Promise<{
  formatted_address: string;
  components: {
    city?: string;
    street?: string;
    district?: string;
    house?: string;
  };
}> => {
  const response = await apiClient.post('/maps/reverse-geocode/', { 
    latitude: lat, 
    longitude: lng 
  });
  return response.data;
};

// Модерация (для модераторов)
export const getPendingSubmissions = async (): Promise<PlaceSubmission[]> => {
  const response = await apiClient.get('/maps/pois/submissions/pending/');
  const data = response.data;
  return Array.isArray(data) ? data : (data.results || []);
};

export const moderateSubmission = async (
  submissionUuid: string,
  action: 'approve' | 'reject' | 'request_changes',
  comment: string
): Promise<PlaceSubmission> => {
  const response = await apiClient.post(`/maps/pois/submissions/${submissionUuid}/moderate/`, {
    action,
    comment,
  });
  return response.data;
};

// Массовая загрузка (для модераторов)
export const bulkUploadPlaces = async (
  file: File,
  autoCreateCategories: boolean = false
): Promise<{
  total: number;
  created: number;
  errors: number;
  errors_details?: Array<{ message: string; row?: number }>;
  categories_created?: string[];
}> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('auto_create_categories', String(autoCreateCategories));

  const response = await apiClient.post('/maps/pois/bulk-upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Управление категориями (для модераторов)
export const createCategory = async (data: Partial<POICategory>): Promise<POICategory> => {
  const response = await apiClient.post('/maps/categories/', data);
  return response.data;
};

export const updateCategory = async (slug: string, data: Partial<POICategory>): Promise<POICategory> => {
  const response = await apiClient.put(`/maps/categories/${slug}/`, data);
  return response.data;
};

export const updateCategorySchema = async (
  categorySlug: string, 
  schema: Partial<FormSchema>
): Promise<FormSchema> => {
  const response = await apiClient.put(`/maps/categories/${categorySlug}/schema/`, schema);
  return response.data;
};

