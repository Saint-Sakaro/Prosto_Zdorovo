import React, { useEffect, useRef } from 'react';
import { POI } from '../../api/maps';

interface POIMarkerProps {
  poi: POI;
  map: any;
  onClick: (poi: POI) => void;
}

export const POIMarker: React.FC<POIMarkerProps> = ({ poi, map, onClick }) => {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !window.ymaps || !poi) {
      return;
    }

    // В Яндекс.Картах координаты в формате [широта, долгота]
    // Преобразуем в числа, если пришли строки
    const lon = typeof poi.longitude === 'string' ? parseFloat(poi.longitude) : poi.longitude;
    const lat = typeof poi.latitude === 'string' ? parseFloat(poi.latitude) : poi.latitude;
    
    if (!lon || !lat || isNaN(lon) || isNaN(lat)) {
      console.warn('Invalid coordinates for POI:', poi);
      return;
    }
    
    const coordinates = [lat, lon];

    try {
      // Создаем маркер с самым простым preset
      const marker = new window.ymaps.Placemark(
        coordinates,
        {
          hintContent: poi.name,
          balloonContentHeader: poi.name,
        },
        {
          preset: 'islands#blueCircleDotIcon',
        }
      );

      // Обработчик клика
      marker.events.add('click', () => {
        onClick(poi);
      });

      // Добавляем маркер на карту
      map.geoObjects.add(marker);
      markerRef.current = marker;
      
      // Принудительно показываем маркер
      marker.options.set('visible', true);
      
      // Проверяем, что маркер действительно добавлен
      setTimeout(() => {
        const geoObjectsCount = map.geoObjects.getLength();
        const markerCoords = marker.geometry.getCoordinates();
        const mapCenter = map.getCenter();
        const mapZoom = map.getZoom();
        
        console.log('Marker status:', {
          name: poi.name,
          coordinates: markerCoords,
          geoObjectsCount,
          markerVisible: marker.options.get('visible'),
          mapCenter,
          mapZoom,
          distance: Math.sqrt(
            Math.pow(markerCoords[0] - mapCenter[0], 2) +
            Math.pow(markerCoords[1] - mapCenter[1], 2)
          ),
        });
      }, 100);

      return () => {
        if (markerRef.current && map && map.geoObjects) {
          try {
            map.geoObjects.remove(markerRef.current);
          } catch (err) {
            console.warn('Error removing marker:', err);
          }
        }
      };
    } catch (err) {
      console.error('Error creating marker for POI:', poi, err);
    }
  }, [poi.uuid, poi.latitude, poi.longitude, poi.name, poi.marker_color, map]);

  return null;
};

