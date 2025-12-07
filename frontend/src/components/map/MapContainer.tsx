import React, { useEffect, useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { YMaps, Map, Placemark, Circle, Polygon } from '@pbe/react-yandex-maps';
import { mapsApi, POI, POIDetails, AnalysisResult, AnalysisRequest } from '../../api/maps';
import { gamificationApi } from '../../api/gamification';
import { CategoryFilters } from './CategoryFilters';
import { POIModal } from './POIModal';
import { AnalysisPanel } from './AnalysisPanel';
import { AnalysisResults } from './AnalysisResults';
import { MapSidebar } from './MapSidebar';
import { ReviewFormModal } from './ReviewFormModal';
import { CreatePOIModal } from './CreatePOIModal';
import { ZOOM_THRESHOLDS } from '../../types/maps';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { theme } from '../../theme';

declare global {
  interface Window {
    ymaps: any;
  }
}

const MapWrapper = styled.div`
  width: 100%;
  height: calc(100vh - 80px);
  position: relative;
  background: ${({ theme }) => theme.colors.background.main};
  display: flex;
  flex-direction: row;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const MapContainerDiv = styled.div`
  flex: 1;
  height: 100%;
  position: relative;

  @media (max-width: 768px) {
    height: 60vh;
    min-height: 400px;
  }
`;

const LoadingOverlay = styled(Card)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
`;

const ErrorMessage = styled(Card)`
  position: absolute;
  top: ${({ theme }) => theme.spacing.lg};
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.error};
  color: ${({ theme }) => theme.colors.accent.error};
`;

const InfoPanel = styled(Card)`
  position: absolute;
  top: ${({ theme }) => theme.spacing.lg};
  right: ${({ theme }) => theme.spacing.lg};
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const MapContainer: React.FC = () => {
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapState, setMapState] = useState({
    center: [55.7558, 37.6173] as [number, number], // Москва [широта, долгота]
    zoom: 10,
  });
  const [currentZoom, setCurrentZoom] = useState(10);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [selectedPOIDetails, setSelectedPOIDetails] = useState<POIDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [isCreatePOIOpen, setIsCreatePOIOpen] = useState(false);
  const [createPOICoordinates, setCreatePOICoordinates] = useState<[number, number] | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const mapRef = useRef<any>(null);
  
  // Состояние для режима анализа
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<'area' | 'radius'>('area');
  const [radiusCenter, setRadiusCenter] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(1000); // в метрах
  const [areaCenter, setAreaCenter] = useState<[number, number] | null>(null); // Центр для анализа области
  const [areaType, setAreaType] = useState<'city' | 'street' | 'block' | null>(null); // Тип выбранной области
  const [isDetectingAreaType, setIsDetectingAreaType] = useState(false); // Флаг определения типа области
  const [areaPolygon, setAreaPolygon] = useState<[number, number][] | null>(null); // Координаты полигона области
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadPOIs = useCallback(async (bounds: {
    sw_lat: number;
    sw_lon: number;
    ne_lat: number;
    ne_lon: number;
  }) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading POIs with bounds:', bounds);

      const params: any = {
        sw_lat: bounds.sw_lat,
        sw_lon: bounds.sw_lon,
        ne_lat: bounds.ne_lat,
        ne_lon: bounds.ne_lon,
      };

      // Добавляем фильтр по категориям, если выбраны
      // Если категории не выбраны, загружаем все POI
      if (selectedCategories.length > 0) {
        params.categories = selectedCategories.join(',');
      }

      const data = await mapsApi.getPOIsInBbox(params);

      const poisList = data.results || [];
      console.log('Loaded POIs:', poisList.length, poisList);
      
      // Фильтруем и нормализуем POI с валидными координатами
      const validPois = poisList
        .map((poi) => ({
          ...poi,
          latitude: typeof poi.latitude === 'string' ? parseFloat(poi.latitude) : poi.latitude,
          longitude: typeof poi.longitude === 'string' ? parseFloat(poi.longitude) : poi.longitude,
        }))
        .filter(
          (poi) =>
            poi.latitude != null &&
            poi.longitude != null &&
            !isNaN(poi.latitude) &&
            !isNaN(poi.longitude) &&
            typeof poi.latitude === 'number' &&
            typeof poi.longitude === 'number'
        );
      
      console.log('Valid POIs:', validPois.length, validPois);
      setPois(validPois);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 
                         err.response?.data?.message || 
                         err.message || 
                         'Ошибка загрузки объектов';
      setError(errorMessage);
      console.error('Error loading POIs:', {
        error: err,
        response: err.response?.data,
        bounds,
        status: err.response?.status,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCategories]);

  // Загрузка POI при изменении видимой области карты
  useEffect(() => {
    if (!mapRef.current) {
      // Если карта еще не готова, ждем немного и пробуем снова
      const timer = setTimeout(() => {
        if (mapRef.current) {
          const map = mapRef.current;
          if (map) {
            try {
              const bounds = map.getBounds();
              if (bounds && Array.isArray(bounds) && bounds.length === 2) {
                const sw = bounds[0];
                const ne = bounds[1];
                if (sw && ne && Array.isArray(sw) && Array.isArray(ne) && 
                    sw.length === 2 && ne.length === 2) {
                  const sw_lat = sw[0];
                  const sw_lon = sw[1];
                  const ne_lat = ne[0];
                  const ne_lon = ne[1];
                  if (!isNaN(sw_lat) && !isNaN(sw_lon) && !isNaN(ne_lat) && !isNaN(ne_lon) &&
                      sw_lat <= ne_lat && sw_lon <= ne_lon) {
                    loadPOIs({ sw_lat, sw_lon, ne_lat, ne_lon });
                  }
                }
              }
            } catch (err) {
              console.error('Error loading POIs on retry:', err);
            }
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    const map = mapRef.current;
    if (!map) return;

    const handleBoundsChange = () => {
      try {
        const bounds = map.getBounds();
        if (!bounds || !Array.isArray(bounds) || bounds.length !== 2) return;

        // bounds[0] = [южная широта, западная долгота]
        // bounds[1] = [северная широта, восточная долгота]
        const sw = bounds[0];
        const ne = bounds[1];

        if (!sw || !ne || !Array.isArray(sw) || !Array.isArray(ne) || 
            sw.length !== 2 || ne.length !== 2) {
          return;
        }

        const sw_lat = sw[0];
        const sw_lon = sw[1];
        const ne_lat = ne[0];
        const ne_lon = ne[1];

        // Проверяем валидность координат
        if (
          isNaN(sw_lat) || isNaN(sw_lon) || isNaN(ne_lat) || isNaN(ne_lon) ||
          sw_lat > ne_lat || sw_lon > ne_lon
        ) {
          return;
        }

        loadPOIs({ sw_lat, sw_lon, ne_lat, ne_lon });
      } catch (err) {
        console.error('Error getting bounds:', err);
      }
    };

    // Подписываемся на событие изменения границ карты
    map.events.add('boundschange', handleBoundsChange);

    // Загружаем POI при первой загрузке
    // Используем небольшую задержку, чтобы карта успела инициализироваться
    const initialLoadTimer = setTimeout(() => {
      handleBoundsChange();
    }, 500);

    return () => {
      clearTimeout(initialLoadTimer);
      if (map && map.events) {
        map.events.remove('boundschange', handleBoundsChange);
      }
    };
  }, [loadPOIs]);

  const handleMarkerClick = useCallback(async (poi: POI) => {
    console.log('🔵 Marker clicked:', poi.name, 'UUID:', poi.uuid);
    
    setSelectedPOI(poi);
    setIsModalOpen(true);
    
    // Загружаем детальную информацию о POI
    try {
      console.log('📡 Loading POI details for UUID:', poi.uuid);
      const details = await mapsApi.getPOIDetails(poi.uuid);
      console.log('✅ POI details loaded:', details);
      setSelectedPOIDetails(details);
    } catch (err: any) {
      console.error('❌ Error loading POI details:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      // Устанавливаем базовую информацию из списка, если детали не загрузились
      setSelectedPOIDetails(null);
    }
  }, []);

  // Создаем HTML контент для balloon
  const createBalloonContent = useCallback((poi: POI) => {
    const healthScore = poi.health_score || 0;
    const scoreColor = healthScore >= 70 ? '#22c55e' : healthScore >= 50 ? '#eab308' : '#ef4444';
    const scoreEmoji = healthScore >= 70 ? '🟢' : healthScore >= 50 ? '🟡' : '🔴';
    
    return `
      <div style="padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 300px;">
        ${poi.category_name ? `
          <div style="margin-bottom: 8px;">
            <span style="display: inline-block; padding: 4px 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; font-size: 11px; color: white; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
              ${poi.category_name}
            </span>
          </div>
        ` : ''}
        ${poi.address ? `
          <div style="margin-bottom: 10px; font-size: 13px; color: #6b7280; line-height: 1.5;">
            📍 ${poi.address}
          </div>
        ` : ''}
        <div style="margin-bottom: 12px; padding: 10px; background: #f9fafb; border-radius: 8px; border-left: 3px solid ${scoreColor};">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 13px; color: #6b7280; font-weight: 500;">Индекс здоровья:</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 16px;">${scoreEmoji}</span>
              <span style="font-size: 16px; font-weight: 700; color: ${scoreColor};">
                ${healthScore.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
        <div style="padding: 8px; background: #eff6ff; border-radius: 6px; text-align: center;">
          <span style="font-size: 12px; color: #3b82f6; font-weight: 500;">
            💡 Кликните на маркер для подробной информации
          </span>
        </div>
      </div>
    `;
  }, []);

  const handleCreateReview = useCallback((poi: POIDetails) => {
    console.log('Create review for POI:', poi);
    setIsModalOpen(false);
    setIsReviewFormOpen(true);
  }, []);

  const handleReviewSubmit = useCallback(async (data: {
    review_type: 'poi_review' | 'incident';
    latitude: number;
    longitude: number;
    category: string;
    content: string;
    has_media: boolean;
    // ⬇️ НОВЫЕ ОПЦИОНАЛЬНЫЕ ПОЛЯ
    rating?: number;        // Оценка 1-5 (для poi_review)
    poi?: string;          // UUID POI (если известен)
  }) => {
    try {
      await gamificationApi.createReview(data);
      setIsReviewFormOpen(false);
      // Обновляем детали POI, чтобы показать новый рейтинг
      if (selectedPOIDetails) {
        const updatedDetails = await mapsApi.getPOIDetails(selectedPOIDetails.uuid);
        setSelectedPOIDetails(updatedDetails);
        setIsModalOpen(true);
      }
    } catch (error) {
      throw error;
    }
  }, [selectedPOIDetails]);


  // Получаем preset стиль на основе цвета категории
  const getPresetStyle = useCallback((markerColor?: string) => {
    if (!markerColor) return 'islands#blueCircleDotIcon';
    
    const color = markerColor.toUpperCase().trim();
    if (color === '#00FF00' || color.includes('GREEN')) {
      return 'islands#greenCircleDotIcon';
    } else if (color === '#FF0000' || color.includes('RED')) {
      return 'islands#redCircleDotIcon';
    } else if (color === '#FFFF00' || color.includes('YELLOW')) {
      return 'islands#yellowCircleDotIcon';
    } else if (color === '#FF00FF' || color.includes('MAGENTA') || color.includes('VIOLET')) {
      return 'islands#violetCircleDotIcon';
    } else if (color === '#0000FF' || color.includes('BLUE')) {
      return 'islands#blueCircleDotIcon';
    }
    return 'islands#blueCircleDotIcon';
  }, []);

  // Получение реальной геометрии области через Yandex Maps API (как в поисковике Яндекса)
  const getAreaBounds = useCallback(async (
    center: [number, number],
    type: 'city' | 'street' | 'block',
    geocodeResult: any
  ): Promise<[number, number][] | null> => {
    try {
      // Проверяем, доступен ли Yandex Maps API
      let attempts = 0;
      const maxAttempts = 10;
      while (!window.ymaps && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.ymaps) {
        console.warn('Yandex Maps API не доступен, используем приблизительные границы');
        return null;
      }

      // Ждем готовности API
      await window.ymaps.ready();

      // Определяем kind на основе типа области и зума (как в поисковике Яндекса)
      let kind: string;
      if (type === 'city') {
        kind = 'locality'; // город
      } else if (type === 'street') {
        kind = 'street'; // улица
      } else {
        // Для квартала используем district или house в зависимости от зума
        if (currentZoom > 17) {
          kind = 'house'; // дом/квартал при очень большом зуме
        } else if (currentZoom > 15) {
          kind = 'street'; // улица при большом зуме (для квартала)
        } else {
          kind = 'district'; // район при среднем зуме
        }
      }

      console.log('🔍 Reverse geocode для получения границ:', {
        center,
        type,
        kind,
        zoom: currentZoom,
      });

      // Используем reverse geocode с координатами и kind (как в поисковике Яндекса)
      // Формат: [lat, lon] для @pbe/react-yandex-maps
      const geocoder = window.ymaps.geocode(center, {
        kind: kind,
        results: 1,
      });
      
      const result = await geocoder;

      if (result.geoObjects.getLength() === 0) {
        console.warn('Геообъект не найден для kind:', kind);
        return null;
      }

      const firstGeoObject = result.geoObjects.get(0);
      
      // Логируем информацию о найденном объекте
      const geoObjectName = firstGeoObject.properties?.get('name') || firstGeoObject.properties?.get('text') || 'Неизвестно';
      const geoObjectKind = firstGeoObject.properties?.get('kind') || 'Неизвестно';
      console.log('📍 Найден геообъект:', {
        name: geoObjectName,
        kind: geoObjectKind,
        geometryType: firstGeoObject.geometry?.getType?.() || 'Неизвестно',
      });
      
      return extractPolygonFromGeoObject(firstGeoObject, center, type);
    } catch (err) {
      console.error('❌ Ошибка при получении границ области:', err);
      return null;
    }
  }, [currentZoom]);

  // Извлечение полигона из геообъекта Yandex Maps (как в поисковике Яндекса)
  const extractPolygonFromGeoObject = useCallback((
    geoObject: any,
    center: [number, number],
    type: 'city' | 'street' | 'block'
  ): [number, number][] | null => {
    try {
      if (!geoObject) {
        return null;
      }

      // Сначала пробуем получить boundedBy (границы объекта) - это работает для всех типов
      const boundedBy = geoObject.properties?.get('boundedBy');
      
      if (boundedBy && Array.isArray(boundedBy) && boundedBy.length === 2) {
        // boundedBy: [[sw_lat, sw_lon], [ne_lat, ne_lon]] - юго-запад и северо-восток
        const sw = boundedBy[0]; // [sw_lat, sw_lon]
        const ne = boundedBy[1]; // [ne_lat, ne_lon]
        
        console.log('📍 Используем boundedBy для создания полигона:', {
          sw,
          ne,
          type,
        });
        
        // Создаем прямоугольный полигон из bounds
        // Формат для Polygon: [[lat, lon], [lat, lon], ...]
        const polygon: [number, number][] = [
          [sw[0], sw[1]], // Юго-запад [lat, lon]
          [sw[0], ne[1]], // Юго-восток [lat, lon]
          [ne[0], ne[1]], // Северо-восток [lat, lon]
          [ne[0], sw[1]], // Северо-запад [lat, lon]
          [sw[0], sw[1]], // Замыкаем полигон
        ];
        
        return polygon;
      }

      // Если boundedBy нет, пробуем получить реальную геометрию
      if (!geoObject.geometry) {
        console.warn('Нет ни boundedBy, ни geometry');
        return null;
      }

      const geometry = geoObject.geometry;
      const geometryType = geometry.getType();
      
      console.log('📍 Тип геометрии:', geometryType);

      let coordinates: any = null;

      if (geometryType === 'Polygon') {
        // Полигон - получаем координаты
        // Формат: [[[lon, lat], [lon, lat], ...]] - массив контуров
        const polygonCoords = geometry.getCoordinates();
        
        if (polygonCoords && Array.isArray(polygonCoords) && polygonCoords.length > 0) {
          // Берем первый контур (внешний контур полигона)
          if (Array.isArray(polygonCoords[0]) && polygonCoords[0].length > 0) {
            coordinates = polygonCoords[0];
          }
        }
      } else if (geometryType === 'MultiPolygon') {
        // Мультиполигон - берем первый полигон
        const multiCoords = geometry.getCoordinates();
        if (multiCoords && Array.isArray(multiCoords) && multiCoords.length > 0) {
          const firstPolygon = multiCoords[0];
          if (firstPolygon && Array.isArray(firstPolygon) && firstPolygon.length > 0) {
            coordinates = firstPolygon[0];
          }
        }
      } else if (geometryType === 'Point') {
        // Для точки используем boundedBy (уже проверили выше)
        return null;
      } else {
        // Для других типов пытаемся получить bounds
        const bounds = geometry.getBounds();
        if (bounds && Array.isArray(bounds) && bounds.length === 2) {
          const sw = bounds[0];
          const ne = bounds[1];
          return [
            [sw[0], sw[1]],
            [sw[0], ne[1]],
            [ne[0], ne[1]],
            [ne[0], sw[1]],
            [sw[0], sw[1]],
          ];
        }
        return null;
      }

      if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
        console.warn('Координаты не найдены или пусты');
        return null;
      }

      console.log('📍 Получены координаты геометрии:', {
        type: geometryType,
        coordinatesLength: coordinates.length,
        sampleCoords: coordinates.slice(0, 3),
      });

      // Преобразуем координаты в формат [lat, lon][]
      // Yandex Maps API возвращает координаты как [lon, lat]
      // А компонент Polygon из @pbe/react-yandex-maps ожидает [lat, lon]
      const polygon: [number, number][] = coordinates.map((coord: any) => {
        if (Array.isArray(coord) && coord.length >= 2) {
          const lon = coord[0];
          const lat = coord[1];
          
          if (typeof lat === 'number' && typeof lon === 'number' &&
              lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            return [lat, lon]; // [широта, долгота]
          }
        }
        return null;
      }).filter((coord: any) => coord !== null && coord[0] !== null && coord[1] !== null) as [number, number][];

      // Убеждаемся, что полигон замкнут
      if (polygon.length > 0) {
        const first = polygon[0];
        const last = polygon[polygon.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          polygon.push([first[0], first[1]]);
        }
      }

      return polygon.length > 0 ? polygon : null;
    } catch (err) {
      console.error('❌ Ошибка при извлечении полигона:', err);
      return null;
    }
  }, []);

  // Генерация приблизительного полигона (fallback)
  const generateApproximatePolygon = useCallback((center: [number, number], type: 'city' | 'street' | 'block'): [number, number][] => {
    const [lat, lon] = center;
    
    // Размер области в метрах в зависимости от типа
    let sizeMeters: number;
    if (type === 'street') {
      sizeMeters = 300; // Улица: 300 метров
    } else if (type === 'block') {
      sizeMeters = 600; // Квартал: 600 метров
    } else {
      sizeMeters = 5000; // Город: 5 км
    }
    
    // Преобразуем метры в градусы (приблизительно: 1 градус ≈ 111 км)
    const sizeDegrees = sizeMeters / 111000;
    const halfSize = sizeDegrees / 2;
    
    // Создаем квадратный полигон вокруг центра
    const polygon: [number, number][] = [
      [lat - halfSize, lon - halfSize], // Юго-запад
      [lat - halfSize, lon + halfSize], // Юго-восток
      [lat + halfSize, lon + halfSize], // Северо-восток
      [lat + halfSize, lon - halfSize], // Северо-запад
      [lat - halfSize, lon - halfSize], // Замыкаем полигон
    ];
    
    return polygon;
  }, []);

  // Определение типа области на основе координат
  const detectAreaType = useCallback(async (coords: [number, number]) => {
    setIsDetectingAreaType(true);
    setAreaType(null);
    setAreaPolygon(null);
    
    try {
      const [lat, lon] = coords;
      
      // Вызываем reverse geocoding для определения типа области
      const geocodeResult = await mapsApi.reverseGeocode({
        latitude: lat,
        longitude: lon,
      });
      
      console.log('📍 Reverse geocoding result:', geocodeResult);
      
      // Определяем тип области на основе зума карты (как в поисковике Яндекса)
      // Чем больше зум, тем более детальный уровень выбираем
      let detectedType: 'city' | 'street' | 'block' = 'city';
      
      if (currentZoom > 17) {
        // Очень близкий зум - квартал/дом
        detectedType = 'block';
        console.log('✅ Определен тип: квартал (зум > 17)');
      } else if (currentZoom > 15) {
        // Близкий зум - улица
        detectedType = 'street';
        console.log('✅ Определен тип: улица (зум > 15)');
      } else if (currentZoom > 12) {
        // Средний зум - район (используем как квартал)
        detectedType = 'block';
        console.log('✅ Определен тип: район/квартал (зум > 12)');
      } else {
        // Далёкий зум - город
        detectedType = 'city';
        console.log('✅ Определен тип: город (зум <= 12)');
      }
      
      console.log('🔍 Определение типа области:', {
        zoom: currentZoom,
        detectedType,
        components: geocodeResult.components,
      });
      
      console.log('✅ Detected area type:', detectedType);
      setAreaType(detectedType);
      
      // Получаем реальные границы области через Yandex Maps API
      const polygon = await getAreaBounds(coords, detectedType, geocodeResult);
      if (polygon && polygon.length > 0) {
        console.log('✅ Получен полигон с', polygon.length, 'точками');
        setAreaPolygon(polygon);
      } else {
        console.warn('⚠️ Не удалось получить реальные границы, используем приблизительный полигон');
        // Fallback на приблизительный полигон
        const approximatePolygon = generateApproximatePolygon(coords, detectedType);
        setAreaPolygon(approximatePolygon);
      }
    } catch (err: any) {
      console.error('❌ Error detecting area type:', err);
      // В случае ошибки определяем тип по умолчанию на основе зума
      let defaultType: 'city' | 'street' | 'block' = 'city';
      if (currentZoom >= 15) {
        defaultType = 'block';
      } else if (currentZoom >= 10) {
        defaultType = 'city';
      }
      
      setAreaType(defaultType);
      
      // Генерируем приблизительный полигон для визуализации
      const polygon = generateApproximatePolygon(coords, defaultType);
      setAreaPolygon(polygon);
    } finally {
      setIsDetectingAreaType(false);
    }
  }, [currentZoom, getAreaBounds, generateApproximatePolygon]);

  // Обработчик правого клика для создания POI
  const handleMapRightClick = useCallback((e: any) => {
    e.preventDefault();
    try {
      const coords = e.get('coords');
      console.log('Map right-clicked, coords:', coords);
      
      if (coords && Array.isArray(coords) && coords.length === 2) {
        const lat = coords[0];
        const lon = coords[1];
        
        // Проверяем, что это валидные координаты
        let finalLat: number;
        let finalLon: number;
        
        if (lat >= 50 && lat <= 60 && lon >= 30 && lon <= 40) {
          finalLat = lat;
          finalLon = lon;
        } else {
          finalLat = lon;
          finalLon = lat;
        }
        
        // Открываем модальное окно создания POI
        setCreatePOICoordinates([finalLat, finalLon]);
        setIsCreatePOIOpen(true);
      }
    } catch (err) {
      console.error('Error handling map right click:', err);
    }
  }, []);

  // Обработчик клика на карту для выбора центра анализа
  const handleMapClick = useCallback((e: any) => {
    try {
      const coords = e.get('coords');
      console.log('Map clicked, coords:', coords);
      
      if (coords && Array.isArray(coords) && coords.length === 2) {
        // В @pbe/react-yandex-maps onClick возвращает [широта, долгота]
        // Но нужно проверить фактический формат
        const lat = coords[0];
        const lon = coords[1];
        
        // Проверяем, что это валидные координаты для Москвы
        let finalLat: number;
        let finalLon: number;
        
        if (lat >= 50 && lat <= 60 && lon >= 30 && lon <= 40) {
          finalLat = lat;
          finalLon = lon;
        } else {
          // Если координаты в другом формате [lon, lat], меняем местами
          finalLat = lon;
          finalLon = lat;
        }
        
        // Обрабатываем клик в зависимости от режима
        if (activeAnalysisMode === 'radius') {
          setRadiusCenter([finalLat, finalLon]);
          console.log('✅ Radius center selected:', [finalLat, finalLon]);
        } else if (activeAnalysisMode === 'area') {
          setAreaCenter([finalLat, finalLon]);
          setAreaType(null); // Сбрасываем тип области
          setAreaPolygon(null); // Сбрасываем полигон
          console.log('✅ Area center selected:', [finalLat, finalLon]);
          // Определяем тип области
          detectAreaType([finalLat, finalLon]);
        }
      }
    } catch (err) {
      console.error('Error handling map click:', err);
    }
  }, [activeAnalysisMode, detectAreaType]);

  // Выполнение анализа области по радиусу
  const handleAnalyze = useCallback(async () => {
    if (!radiusCenter) {
      setError('Выберите центр анализа на карте');
      return;
    }

    if (!radius || radius <= 0) {
      setError('Укажите радиус анализа');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Округляем координаты до 6 знаков после запятой (как ожидает бэкенд: max_digits=9, decimal_places=6)
      const centerLat = Number(radiusCenter[0].toFixed(6));
      const centerLon = Number(radiusCenter[1].toFixed(6));
      
      // Проверяем, что координаты в допустимом диапазоне
      if (isNaN(centerLat) || isNaN(centerLon) || centerLat < -90 || centerLat > 90 || centerLon < -180 || centerLon > 180) {
        setError('Некорректные координаты');
        setIsAnalyzing(false);
        return;
      }
      
      // Проверяем радиус
      if (isNaN(radius) || radius < 1 || radius > 50000) {
        setError('Некорректный радиус (должен быть от 1 до 50000 метров)');
        setIsAnalyzing(false);
        return;
      }
      
      // Формируем запрос для анализа по радиусу
      const requestData: AnalysisRequest = {
        analysis_type: 'radius',
        center_lat: centerLat, // широта (округленная до 6 знаков)
        center_lon: centerLon, // долгота (округленная до 6 знаков)
        radius_meters: Math.round(radius), // Округляем радиус до целого числа
      };
      
      // Добавляем фильтры категорий, если выбраны
      if (selectedCategories.length > 0) {
        requestData.category_filters = selectedCategories;
      }
      
      console.log('📤 Sending radius analysis request:', requestData);
      console.log('📍 Center coordinates (original):', radiusCenter);
      console.log('📍 Center coordinates (rounded):', [centerLat, centerLon]);
      console.log('📏 Radius:', radius, 'meters (rounded:', Math.round(radius), ')');
      console.log('🔍 Category filters:', selectedCategories.length > 0 ? selectedCategories : 'none');
      
      const result = await mapsApi.analyzeArea(requestData);
      
      setAnalysisResult(result);
      console.log('✅ Radius analysis result:', {
        health_index: result.health_index,
        total_count: result.total_count,
        analysis_type: result.analysis_type,
        area_name: result.area_name,
      });
    } catch (err: any) {
      console.error('❌ Error analyzing radius:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        err.message || 
        'Ошибка анализа области'
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [radiusCenter, radius, selectedCategories]);

  // Обработчик изменения зума карты
  const handleZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
  }, []);

  // Сброс состояния области при смене режима
  useEffect(() => {
    if (activeAnalysisMode === 'radius') {
      // При переключении на радиус сбрасываем состояние области
      setAreaCenter(null);
      setAreaType(null);
      setAreaPolygon(null);
    } else if (activeAnalysisMode === 'area') {
      // При переключении на область сбрасываем состояние радиуса
      setRadiusCenter(null);
    }
  }, [activeAnalysisMode]);

  // Вычисление bounding box из координат полигона
  const calculateBoundingBoxFromPolygon = useCallback((polygon: [number, number][]): {
    sw_lat: number;
    sw_lon: number;
    ne_lat: number;
    ne_lon: number;
  } | null => {
    if (!polygon || polygon.length === 0) {
      return null;
    }

    // Находим минимальные и максимальные значения широты и долготы
    let minLat = polygon[0][0];
    let maxLat = polygon[0][0];
    let minLon = polygon[0][1];
    let maxLon = polygon[0][1];

    for (const [lat, lon] of polygon) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }

    return {
      sw_lat: Number(minLat.toFixed(6)),
      sw_lon: Number(minLon.toFixed(6)),
      ne_lat: Number(maxLat.toFixed(6)),
      ne_lon: Number(maxLon.toFixed(6)),
    };
  }, []);

  // Выполнение анализа области (город/улица/квартал)
  const handleAreaAnalyze = useCallback(async () => {
    if (!areaCenter || !areaType || !areaPolygon) {
      setError('Выберите точку на карте для анализа');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Вычисляем bounding box из координат полигона
      const bbox = calculateBoundingBoxFromPolygon(areaPolygon);
      
      if (!bbox) {
        setError('Не удалось вычислить границы области');
        setIsAnalyzing(false);
        return;
      }

      // Определяем тип анализа на основе типа области
      let analysisType: 'city' | 'street';
      
      if (areaType === 'street') {
        analysisType = 'street';
      } else if (areaType === 'block') {
        analysisType = 'street'; // Квартал анализируем как улицу
      } else {
        analysisType = 'city';
      }

      const requestData: AnalysisRequest = {
        analysis_type: analysisType,
        sw_lat: bbox.sw_lat,
        sw_lon: bbox.sw_lon,
        ne_lat: bbox.ne_lat,
        ne_lon: bbox.ne_lon,
      };

      // Добавляем фильтры категорий, если выбраны
      if (selectedCategories.length > 0) {
        requestData.category_filters = selectedCategories;
      }

      console.log('📤 Sending area analysis request:', requestData);
      console.log('📍 Area type:', areaType);
      console.log('📍 Analysis type:', analysisType);
      console.log('📍 Bounding box from polygon:', bbox);
      console.log('📍 Polygon points count:', areaPolygon.length);

      const result = await mapsApi.analyzeArea(requestData);
      
      setAnalysisResult(result);
      console.log('✅ Area analysis result:', result);
    } catch (err: any) {
      console.error('❌ Error analyzing area:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        err.message || 
        'Ошибка анализа области'
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [areaCenter, areaType, areaPolygon, selectedCategories, calculateBoundingBoxFromPolygon]);

  // Фильтруем POI по категориям
  // Если ни одна категория не выбрана, не показываем метки
  const filteredPois = pois.filter((poi) => {
    if (selectedCategories.length === 0) {
      return false; // Не показываем метки, если ничего не выбрано
    }
    return selectedCategories.includes(poi.category_uuid);
  });

  return (
    <MapWrapper>
      <MapSidebar poisCount={filteredPois.length}>
        <CategoryFilters
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
        />
        
        <AnalysisPanel
          currentZoom={currentZoom}
          onAreaAnalyze={handleAreaAnalyze}
          areaCenter={areaCenter}
          areaType={areaType}
          isDetectingAreaType={isDetectingAreaType}
          radius={radius}
          onRadiusChange={setRadius}
          onRadiusAnalyze={handleAnalyze}
          radiusCenter={radiusCenter}
          onMapClick={handleMapClick}
          isAnalyzing={isAnalyzing}
          activeMode={activeAnalysisMode}
          onModeChange={setActiveAnalysisMode}
        />

        {analysisResult && (
          <AnalysisResults
            result={analysisResult}
            onClose={() => setAnalysisResult(null)}
          />
        )}
      </MapSidebar>

      <MapContainerDiv>
        <YMaps
          query={{
            apikey: '5e4a4a8a-a758-45a6-a7c7-56ae3f6cbf63',
            lang: 'ru_RU',
          }}
        >
          <Map
            defaultState={mapState}
            width="100%"
            height="100%"
            instanceRef={mapRef}
            modules={['control.ZoomControl', 'control.FullscreenControl']}
            onClick={handleMapClick}
            onBoundsChange={(e: any) => {
              // Обновляем зум при изменении границ
              if (mapRef.current) {
                const zoom = mapRef.current.getZoom();
                if (zoom !== currentZoom) {
                  setCurrentZoom(zoom);
                }
              }
            }}
          >
            {/* Отображаем маркеры для всех отфильтрованных POI */}
            {filteredPois.map((poi) => {
              // В @pbe/react-yandex-maps координаты для Placemark: [широта, долгота]
              const coordinates: [number, number] = [poi.latitude, poi.longitude];
              
              return (
                <Placemark
                  key={poi.uuid}
                  geometry={coordinates}
                  properties={{
                    hintContent: poi.name,
                    balloonContentHeader: `
                      <div style="font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 4px; line-height: 1.3;">
                        ${poi.name}
                      </div>
                    `,
                    balloonContentBody: createBalloonContent(poi),
                  }}
                  options={{
                    preset: getPresetStyle(poi.marker_color),
                    draggable: false,
                    balloonMaxWidth: 320,
                    balloonMinWidth: 280,
                    openBalloonOnClick: true,
                    hideIconOnBalloonOpen: false,
                    balloonCloseButton: true,
                  }}
                  onClick={() => {
                    console.log('🔵 Placemark onClick triggered for:', poi.name);
                    handleMarkerClick(poi);
                  }}
                />
              );
            })}
            
            {/* Визуализация круга для анализа по радиусу */}
            {activeAnalysisMode === 'radius' && radiusCenter && (
              <Circle
                geometry={[radiusCenter, radius]} // [center, radius]
                options={{
                  fillColor: '#00FF0020',
                  fillOpacity: 0.3,
                  strokeColor: '#00FF00',
                  strokeOpacity: 0.8,
                  strokeWidth: 2,
                }}
              />
            )}
            
            {/* Визуализация полигона для анализа области */}
            {activeAnalysisMode === 'area' && areaPolygon && areaCenter && areaPolygon.length > 0 && (
              <Polygon
                geometry={[areaPolygon]}
                options={{
                  fillColor: '#00FF0020',
                  fillOpacity: 0.3,
                  strokeColor: '#00FF00',
                  strokeOpacity: 0.8,
                  strokeWidth: 2,
                }}
              />
            )}
            
            {/* Маркер центра анализа для радиуса */}
            {activeAnalysisMode === 'radius' && radiusCenter && (
              <Placemark
                geometry={radiusCenter}
                properties={{
                  hintContent: 'Центр анализа',
                  balloonContentHeader: 'Центр анализа',
                  balloonContentBody: `Радиус: ${radius >= 1000 ? `${(radius / 1000).toFixed(1)} км` : `${radius} м`}`,
                }}
                options={{
                  preset: 'islands#redCircleDotIcon',
                  draggable: false,
                }}
              />
            )}
            
            {/* Маркер центра анализа для области */}
            {activeAnalysisMode === 'area' && areaCenter && (
              <Placemark
                geometry={areaCenter}
                properties={{
                  hintContent: 'Центр анализа области',
                  balloonContentHeader: 'Центр анализа области',
                  balloonContentBody: `Тип: ${areaType === 'city' ? 'Город/Область' : areaType === 'street' ? 'Улица' : 'Квартал'}`,
                }}
                options={{
                  preset: 'islands#blueCircleDotIcon',
                  draggable: false,
                }}
              />
            )}
          </Map>
        </YMaps>

        {error && <ErrorMessage>{error}</ErrorMessage>}
      </MapContainerDiv>

      <POIModal
        poi={selectedPOIDetails}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPOIDetails(null);
        }}
        onCreateReview={handleCreateReview}
      />

      <ReviewFormModal
        poi={selectedPOIDetails}
        isOpen={isReviewFormOpen}
        onClose={() => {
          setIsReviewFormOpen(false);
        }}
        onSubmit={handleReviewSubmit}
      />

      <CreatePOIModal
        isOpen={isCreatePOIOpen}
        onClose={() => {
          setIsCreatePOIOpen(false);
          setCreatePOICoordinates(null);
        }}
        onSave={async (poiData) => {
          try {
            const newPOI = await mapsApi.createPOI(poiData);
            console.log('✅ POI created:', newPOI);
            
            // Обновляем список POI
            if (mapRef.current) {
              const bounds = mapRef.current.getBounds();
              if (bounds && Array.isArray(bounds) && bounds.length === 2) {
                const sw = bounds[0];
                const ne = bounds[1];
                if (sw && ne && Array.isArray(sw) && Array.isArray(ne)) {
                  loadPOIs({
                    sw_lat: sw[0],
                    sw_lon: sw[1],
                    ne_lat: ne[0],
                    ne_lon: ne[1],
                  });
                }
              }
            }
            
            setIsCreatePOIOpen(false);
            setCreatePOICoordinates(null);
          } catch (error) {
            throw error;
          }
        }}
        initialCoordinates={createPOICoordinates || undefined}
      />
    </MapWrapper>
  );
};
