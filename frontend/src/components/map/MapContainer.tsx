import React, { useEffect, useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { useYandexMap } from '../../hooks/useYandexMap';
import { mapsApi, POI, POIDetails } from '../../api/maps';
import { CategoryFilters } from './CategoryFilters';
import { POIModal } from './POIModal';
import { Card } from '../common/Card';
import { theme } from '../../theme';

const MapWrapper = styled.div`
  width: 100%;
  height: calc(100vh - 80px);
  position: relative;
  background: ${({ theme }) => theme.colors.background.main};
`;

const MapDiv = styled.div`
  width: 100%;
  height: 100%;
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
  const [bounds, setBounds] = useState<{
    sw: [number, number];
    ne: [number, number];
  } | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [selectedPOIDetails, setSelectedPOIDetails] = useState<POIDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const markersRef = useRef<Map<string, any>>(new Map());

  const handleBoundsChange = useCallback(
    (newBounds: { sw: [number, number]; ne: [number, number] }) => {
      setBounds(newBounds);
    },
    []
  );

  const { mapRef, mapInstance, isReady, error: mapError } = useYandexMap({
    center: [55.7558, 37.6173], // Москва [широта, долгота] - useYandexMap принимает [lat, lon]
    zoom: 10,
    onBoundsChange: handleBoundsChange,
  });

  // Загрузка POI при изменении видимой области
  useEffect(() => {
    if (!isReady || !bounds || !mapInstance) return;

    const loadPOIs = async () => {
      try {
        setLoading(true);
        setError(null);

        // Проверяем валидность bounds
        if (
          !bounds.sw ||
          !bounds.ne ||
          !Array.isArray(bounds.sw) ||
          !Array.isArray(bounds.ne) ||
          bounds.sw.length !== 2 ||
          bounds.ne.length !== 2
        ) {
          console.warn('Invalid bounds:', bounds);
          return;
        }

        const sw_lat = bounds.sw[0];
        const sw_lon = bounds.sw[1];
        const ne_lat = bounds.ne[0];
        const ne_lon = bounds.ne[1];

        // Проверяем, что координаты валидны
        if (
          isNaN(sw_lat) ||
          isNaN(sw_lon) ||
          isNaN(ne_lat) ||
          isNaN(ne_lon) ||
          sw_lat > ne_lat ||
          sw_lon > ne_lon
        ) {
          console.warn('Invalid coordinates:', { sw_lat, sw_lon, ne_lat, ne_lon });
          return;
        }

        console.log('Loading POIs with bounds:', { sw_lat, sw_lon, ne_lat, ne_lon });

        const params: any = {
          sw_lat,
          sw_lon,
          ne_lat,
          ne_lon,
        };

        // Добавляем фильтр по категориям, если выбраны
        if (selectedCategories.length > 0) {
          params.categories = selectedCategories.join(',');
        }

        const data = await mapsApi.getPOIsInBbox(params);

        const poisList = data.results || [];
        console.log('Loaded POIs:', poisList.length, poisList);
        
        // Фильтруем и нормализуем POI с валидными координатами
        // Координаты могут приходить как строки из API
        const validPois = poisList
          .map((poi) => ({
            ...poi,
            // Преобразуем координаты в числа, если они строки
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
    };

    // Debounce для оптимизации
    const timeoutId = setTimeout(loadPOIs, 300);
    return () => clearTimeout(timeoutId);
  }, [bounds, isReady, mapInstance, selectedCategories]);


  const handleMarkerClick = useCallback(async (poi: POI) => {
    setSelectedPOI(poi);
    setIsModalOpen(true);
    
    // Загружаем детальную информацию о POI
    try {
      const details = await mapsApi.getPOIDetails(poi.uuid);
      setSelectedPOIDetails(details);
    } catch (err: any) {
      console.error('Error loading POI details:', err);
      // Оставляем базовую информацию из списка
      setSelectedPOIDetails(null);
    }
  }, []);

  const handleCreateReview = useCallback((poi: POIDetails) => {
    // Переход на страницу создания отзыва с предзаполненными данными
    // Это будет реализовано в этапе 7 (интеграция с геймификацией)
    console.log('Create review for POI:', poi);
    setIsModalOpen(false);
  }, []);

  // Обновляем маркеры при изменении фильтров или списка POI
  useEffect(() => {
    if (!isReady || !mapInstance || !window.ymaps) {
      console.log('⚠️ Map not ready yet:', { isReady, mapInstance: !!mapInstance, ymaps: !!window.ymaps });
      return;
    }
    
    // Дополнительная проверка, что карта действительно готова
    try {
      const testCenter = mapInstance.getCenter();
      if (!testCenter || !Array.isArray(testCenter) || testCenter.length !== 2) {
        console.warn('⚠️ Map center is invalid, waiting...');
        return;
      }
    } catch (err) {
      console.warn('⚠️ Map not fully initialized, waiting...', err);
      return;
    }

    // Удаляем старые маркеры
    markersRef.current.forEach((marker) => {
      try {
        mapInstance.geoObjects.remove(marker);
      } catch (err) {
        console.warn('Error removing old marker:', err);
      }
    });
    markersRef.current.clear();

    if (pois.length === 0) {
      return;
    }

    // Фильтруем по категориям
    const filteredPois = pois.filter((poi) => {
      if (selectedCategories.length === 0) {
        return true;
      }
      return selectedCategories.includes(poi.category_slug);
    });

    console.log('Creating markers for', filteredPois.length, 'POIs');

    // Создаем новые маркеры
    filteredPois.forEach((poi) => {
      try {
        // Преобразуем координаты в числа (они могут быть строками из API)
        const lon = typeof poi.longitude === 'string' ? parseFloat(poi.longitude) : Number(poi.longitude);
        const lat = typeof poi.latitude === 'string' ? parseFloat(poi.latitude) : Number(poi.latitude);

        // Валидация координат
        if (isNaN(lon) || isNaN(lat) || lon === null || lat === null || lon === undefined || lat === undefined) {
          console.warn('❌ Invalid coordinates for POI:', poi.name, { 
            lon, lat, 
            lonType: typeof poi.longitude, 
            latType: typeof poi.latitude,
            original: { lon: poi.longitude, lat: poi.latitude } 
          });
          return;
        }

        // Проверяем диапазон координат
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          console.warn('❌ Coordinates out of range for POI:', poi.name, { lat, lon });
          return;
        }

        // В Яндекс.Картах API 2.1 координаты в формате [долгота, широта] = [longitude, latitude]
        // Согласно документации: https://yandex.ru/dev/jsapi-v1-1/doc/ru/dg/tasks/how-to-add-placemark
        const coordinates: [number, number] = [lon, lat];
        
        console.log('✅ Creating marker:', poi.name, 'coordinates:', coordinates, '[lon, lat]');
        
        // Выбираем preset стиль на основе цвета категории
        let presetStyle = 'islands#blueCircleDotIcon'; // По умолчанию синий
        
        if (poi.marker_color) {
          const color = poi.marker_color.toUpperCase().trim();
          if (color === '#00FF00' || color.includes('GREEN')) {
            presetStyle = 'islands#greenCircleDotIcon';
          } else if (color === '#FF0000' || color.includes('RED')) {
            presetStyle = 'islands#redCircleDotIcon';
          } else if (color === '#FFFF00' || color.includes('YELLOW')) {
            presetStyle = 'islands#yellowCircleDotIcon';
          } else if (color === '#FF00FF' || color.includes('MAGENTA') || color.includes('VIOLET')) {
            presetStyle = 'islands#violetCircleDotIcon';
          } else if (color === '#0000FF' || color.includes('BLUE')) {
            presetStyle = 'islands#blueCircleDotIcon';
          }
        }
        
        // Создаем маркер согласно документации Яндекс.Карт API 2.1
        // Координаты: [долгота, широта] = [longitude, latitude]
        const marker = new window.ymaps.Placemark(
          coordinates, // [долгота, широта]
          {
            hintContent: poi.name,
            balloonContentHeader: poi.name,
            balloonContentBody: `${poi.category_name || ''}${poi.address ? '<br/>' + poi.address : ''}`,
          },
          {
            preset: presetStyle,
            draggable: false,
          }
        );

        // Добавляем обработчик клика
        marker.events.add('click', () => {
          console.log('🔵 Marker clicked:', poi.name);
          handleMarkerClick(poi);
        });

        // Добавляем маркер на карту
        mapInstance.geoObjects.add(marker);
        markersRef.current.set(poi.uuid, marker);
        
        console.log('✅ Marker added to map:', poi.name, 'preset:', presetStyle);
      } catch (err) {
        console.error('❌ Error creating marker for', poi.name, ':', err);
      }
    });

    console.log('✅ Markers created:', markersRef.current.size, 'out of', filteredPois.length);
    
    // Принудительно обновляем карту после добавления всех маркеров
    setTimeout(() => {
      try {
        // Проверяем общее количество geoObjects на карте
        const totalGeoObjects = mapInstance.geoObjects.getLength();
        console.log('📊 Total geoObjects on map:', totalGeoObjects);
        console.log('📊 Map bounds:', mapInstance.getBounds());
        console.log('📊 Map zoom:', mapInstance.getZoom());
        
        // Пытаемся обновить карту
        mapInstance.container.fitToViewport();
        
        // Проверяем, что маркеры действительно на карте
        markersRef.current.forEach((marker, uuid) => {
          const index = mapInstance.geoObjects.indexOf(marker);
          if (index === -1) {
            console.error(`❌ Marker ${uuid} is NOT in geoObjects!`);
          }
        });
      } catch (err) {
        console.error('Error in final check:', err);
      }
    }, 500);
    
    // Тестовый маркер для проверки - добавляем на центр карты
    try {
      const mapCenter = mapInstance.getCenter();
      console.log('Map center:', mapCenter);
      
      // Тестовый маркер в центре карты (зеленый)
      // mapCenter возвращает [широта, долгота], но для Placemark нужны [долгота, широта]
      const testMarker = new window.ymaps.Placemark(
        [mapCenter[1], mapCenter[0]], // Преобразуем [lat, lon] в [lon, lat]
        {
          hintContent: 'Тестовый маркер в центре',
          balloonContentHeader: 'Тестовый маркер в центре карты',
          balloonContentBody: `Координаты: [${mapCenter[1]}, ${mapCenter[0]}] (lon, lat)`,
        },
        {
          preset: 'islands#greenCircleDotIcon',
          draggable: false,
        }
      );
      mapInstance.geoObjects.add(testMarker);
      console.log('✅ Test marker added at map center:', [mapCenter[1], mapCenter[0]], '[lon, lat]');
      
      // Тестовый маркер на Красной площади (красный)
      // Красная площадь: 55.7558 (lat), 37.6173 (lon)
      const testMarker2 = new window.ymaps.Placemark(
        [37.6173, 55.7558], // Красная площадь [долгота, широта]
        {
          hintContent: 'Тестовый маркер - Красная площадь',
          balloonContentHeader: 'Красная площадь',
          balloonContentBody: 'Координаты: [37.6173, 55.7558] (lon, lat)',
        },
        {
          preset: 'islands#redCircleDotIcon',
          draggable: false,
        }
      );
      mapInstance.geoObjects.add(testMarker2);
      console.log('✅ Test marker 2 added at Red Square:', [37.6173, 55.7558], '[lon, lat]');
    } catch (err) {
      console.error('Error creating test marker:', err);
    }

    return () => {
      // Cleanup при размонтировании
      markersRef.current.forEach((marker) => {
        try {
          if (mapInstance && mapInstance.geoObjects) {
            mapInstance.geoObjects.remove(marker);
          }
        } catch (err) {
          console.warn('Error cleaning up marker:', err);
        }
      });
      markersRef.current.clear();
    };
  }, [pois, selectedCategories, isReady, mapInstance, handleMarkerClick]);

  if (mapError) {
    return (
      <MapWrapper>
        <ErrorMessage>{mapError}</ErrorMessage>
      </MapWrapper>
    );
  }

  return (
    <MapWrapper>
      <MapDiv ref={mapRef} />

      {loading && pois.length === 0 && (
        <LoadingOverlay>
          <div>Загрузка карты...</div>
        </LoadingOverlay>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <CategoryFilters
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
      />

      {isReady && (
        <InfoPanel>
          Объектов на карте: {pois.length}
        </InfoPanel>
      )}


      <POIModal
        poi={selectedPOIDetails}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPOIDetails(null);
        }}
        onCreateReview={handleCreateReview}
      />
    </MapWrapper>
  );
};

