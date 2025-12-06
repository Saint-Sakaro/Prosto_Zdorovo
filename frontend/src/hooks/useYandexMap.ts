import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    ymaps: any;
  }
}

export interface UseYandexMapOptions {
  center?: [number, number];
  zoom?: number;
  onMapReady?: (map: any) => void;
  onBoundsChange?: (bounds: { sw: [number, number]; ne: [number, number] }) => void;
  onZoomChange?: (zoom: number) => void;
}

export const useYandexMap = (options: UseYandexMapOptions = {}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      try {
        // Проверяем, загружены ли Яндекс.Карты
        if (!window.ymaps) {
          setError('Яндекс.Карты не загружены. Проверьте подключение скрипта и API ключ.');
          return;
        }

        // Ждем готовности API с обработкой ошибок
        try {
          await window.ymaps.ready();
        } catch (ymapsError: any) {
          // Игнорируем ошибки дополнительных сервисов (такси и т.д.)
          if (ymapsError.message && ymapsError.message.includes('taxi')) {
            console.warn('Предупреждение Яндекс.Карт (можно игнорировать):', ymapsError.message);
          } else {
            throw ymapsError;
          }
        }

        const center = options.center || [55.7558, 37.6173]; // Москва по умолчанию
        const zoom = options.zoom || 10;

        // Создаем карту с настройками для избежания лишних запросов
        const map = new window.ymaps.Map(mapRef.current, {
          center,
          zoom,
          controls: ['zoomControl', 'fullscreenControl'],
          // Отключаем автоматические запросы к дополнительным сервисам
          behaviors: ['default', 'scrollZoom'],
        });

        mapInstanceRef.current = map;
        setIsReady(true);

        if (options.onMapReady) {
          options.onMapReady(map);
        }

        // Обработчики событий
        map.events.add('boundschange', () => {
          try {
            const bounds = map.getBounds();
            if (bounds && Array.isArray(bounds) && bounds.length === 2) {
              // Яндекс.Карты возвращают bounds как массив из двух массивов
              // bounds[0] = [южная широта, западная долгота]
              // bounds[1] = [северная широта, восточная долгота]
              const sw = bounds[0];
              const ne = bounds[1];
              
              if (sw && ne && Array.isArray(sw) && Array.isArray(ne) && 
                  sw.length === 2 && ne.length === 2) {
                if (options.onBoundsChange) {
                  options.onBoundsChange({
                    sw: [sw[0], sw[1]], // sw_lat, sw_lon
                    ne: [ne[0], ne[1]], // ne_lat, ne_lon
                  });
                }
              }
            }
          } catch (err) {
            console.error('Error getting bounds:', err);
          }
        });

        map.events.add('zoomchange', () => {
          const currentZoom = map.getZoom();
          if (options.onZoomChange) {
            options.onZoomChange(currentZoom);
          }
        });

        return () => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.destroy();
            mapInstanceRef.current = null;
          }
        };
      } catch (err: any) {
        setError(err.message || 'Ошибка инициализации карты');
        console.error('Error initializing Yandex Map:', err);
      }
    };

    initMap();
  }, []);

  return {
    mapRef,
    mapInstance: mapInstanceRef.current,
    isReady,
    error,
  };
};

