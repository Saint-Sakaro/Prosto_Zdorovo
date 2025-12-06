import React, { useEffect, useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { YMaps, Map, Placemark, Circle } from '@pbe/react-yandex-maps';
import { mapsApi, POI, POIDetails, AnalysisResult, AnalysisRequest } from '../../api/maps';
import { gamificationApi } from '../../api/gamification';
import { CategoryFilters } from './CategoryFilters';
import { POIModal } from './POIModal';
import { AnalysisPanel } from './AnalysisPanel';
import { AnalysisResults } from './AnalysisResults';
import { MapSidebar } from './MapSidebar';
import { ReviewFormModal } from './ReviewFormModal';
import { ZOOM_THRESHOLDS } from '../../types/maps';
import { Card } from '../common/Card';
import { theme } from '../../theme';

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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const mapRef = useRef<any>(null);
  
  // Состояние для режима анализа
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<'area' | 'radius'>('area');
  const [radiusCenter, setRadiusCenter] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(1000); // в метрах
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

  // Обработчик клика на карту для выбора центра анализа
  const handleMapClick = useCallback((e: any) => {
    // Обрабатываем клик только в режиме радиуса
    if (activeAnalysisMode !== 'radius') return;
    
    try {
      const coords = e.get('coords');
      console.log('Map clicked, coords:', coords);
      
      if (coords && Array.isArray(coords) && coords.length === 2) {
        // В @pbe/react-yandex-maps onClick возвращает [широта, долгота]
        // Но нужно проверить фактический формат
        const lat = coords[0];
        const lon = coords[1];
        
        // Проверяем, что это валидные координаты для Москвы
        if (lat >= 50 && lat <= 60 && lon >= 30 && lon <= 40) {
          setRadiusCenter([lat, lon]);
          console.log('✅ Radius center selected:', [lat, lon]);
        } else {
          // Если координаты в другом формате [lon, lat], меняем местами
          setRadiusCenter([lon, lat]);
          console.log('✅ Radius center selected (swapped):', [lon, lat]);
        }
      }
    } catch (err) {
      console.error('Error handling map click:', err);
    }
  }, [activeAnalysisMode]);

  // Выполнение анализа области
  const handleAnalyze = useCallback(async () => {
    if (!radiusCenter) return;

    setIsAnalyzing(true);
    try {
      // Округляем координаты до 6 знаков после запятой (как ожидает бэкенд: max_digits=9, decimal_places=6)
      // Это означает максимум 3 цифры до запятой и 6 после
      const centerLat = Number(radiusCenter[0].toFixed(6));
      const centerLon = Number(radiusCenter[1].toFixed(6));
      
      // Проверяем, что координаты в допустимом диапазоне
      if (isNaN(centerLat) || isNaN(centerLon) || centerLat < -90 || centerLat > 90 || centerLon < -180 || centerLon > 180) {
        setError('Некорректные координаты');
        setIsAnalyzing(false);
        return;
      }
      
      // Формируем запрос для анализа по радиусу
      const requestData: AnalysisRequest = {
        analysis_type: 'radius',
        center_lat: centerLat, // широта (округленная до 6 знаков)
        center_lon: centerLon, // долгота (округленная до 6 знаков)
        radius_meters: radius,
      };
      
      // Добавляем фильтры категорий, если выбраны
      if (selectedCategories.length > 0) {
        requestData.category_filters = selectedCategories;
      }
      
      console.log('📤 Sending analysis request:', requestData);
      console.log('📍 Center coordinates (original):', radiusCenter);
      console.log('📍 Center coordinates (rounded):', [centerLat, centerLon]);
      console.log('📏 Radius:', radius, 'meters');
      
      const result = await mapsApi.analyzeArea(requestData);
      
      setAnalysisResult(result);
      console.log('✅ Analysis result:', result);
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
  }, [radiusCenter, radius, selectedCategories]);

  // Обработчик изменения зума карты
  const handleZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
  }, []);

  // Выполнение анализа области (город/улица)
  const handleAreaAnalyze = useCallback(async () => {
    if (!mapRef.current) return;

    setIsAnalyzing(true);
    try {
      const map = mapRef.current;
      const bounds = map.getBounds();
      
      if (!bounds || !Array.isArray(bounds) || bounds.length !== 2) {
        setError('Не удалось получить границы карты');
        setIsAnalyzing(false);
        return;
      }

      const sw = bounds[0];
      const ne = bounds[1];

      if (!sw || !ne || !Array.isArray(sw) || !Array.isArray(ne) || 
          sw.length !== 2 || ne.length !== 2) {
        setError('Некорректные границы карты');
        setIsAnalyzing(false);
        return;
      }

      const sw_lat = Number(sw[0].toFixed(6));
      const sw_lon = Number(sw[1].toFixed(6));
      const ne_lat = Number(ne[0].toFixed(6));
      const ne_lon = Number(ne[1].toFixed(6));

      // Определяем тип анализа на основе зума
      let analysisType: 'city' | 'street' = 'city';
      if (currentZoom >= ZOOM_THRESHOLDS.STREET_MIN) {
        analysisType = 'street';
      } else if (currentZoom >= ZOOM_THRESHOLDS.CITY_MIN && currentZoom <= ZOOM_THRESHOLDS.CITY_MAX) {
        analysisType = 'city';
      }

      const requestData: AnalysisRequest = {
        analysis_type: analysisType,
        sw_lat,
        sw_lon,
        ne_lat,
        ne_lon,
      };

      // Добавляем фильтры категорий, если выбраны
      if (selectedCategories.length > 0) {
        requestData.category_filters = selectedCategories;
      }

      console.log('📤 Sending area analysis request:', requestData);
      console.log('📍 Analysis type:', analysisType);
      console.log('📍 Zoom:', currentZoom);

      const result = await mapsApi.analyzeArea(requestData);
      
      setAnalysisResult(result);
      console.log('✅ Area analysis result:', result);
    } catch (err: any) {
      console.error('❌ Error analyzing area:', err);
      console.error('Error response:', err.response?.data);
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        err.message || 
        'Ошибка анализа области'
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentZoom, selectedCategories]);

  // Фильтруем POI по категориям
  // Если ни одна категория не выбрана, не показываем метки
  const filteredPois = pois.filter((poi) => {
    if (selectedCategories.length === 0) {
      return false; // Не показываем метки, если ничего не выбрано
    }
    return selectedCategories.includes(poi.category_slug);
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
            
            {/* Маркер центра анализа */}
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
            
            {/* Визуализация области для анализа города/улицы - убрана, так как визуализация области происходит автоматически через границы карты */}
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
    </MapWrapper>
  );
};
