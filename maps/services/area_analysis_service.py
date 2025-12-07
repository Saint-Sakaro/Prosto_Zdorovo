"""
Сервис анализа областей

Реализует логику анализа областей для трех режимов:
- Анализ в радиусе окружности
- Анализ по городу или округу (bounding box)
- Анализ по улице или кварталу (bounding box)
"""

from django.db.models import Q, Count, Avg
from geopy.distance import geodesic
import logging
from maps.models import POI, POICategory, POIRating
from maps.services.health_index_calculator import HealthIndexCalculator
from maps.services.geocoder_service import GeocoderService
from maps.services.opensearch_service import OpenSearchService

logger = logging.getLogger(__name__)


class AreaAnalysisService:
    """
    Класс для анализа областей на карте
    
    Методы:
    - analyze_radius(): Анализ в радиусе окружности
    - analyze_bounding_box(): Анализ по bounding box (город/улица)
    - get_pois_in_radius(): Получение POI в радиусе
    - get_pois_in_bbox(): Получение POI в bounding box
    """
    
    def __init__(self):
        self.health_calculator = HealthIndexCalculator()
        self.geocoder = GeocoderService()
        self.opensearch = OpenSearchService()
    
    def analyze_radius(self, center_lat, center_lon, radius_meters, category_filters=None):
        """
        Анализ области в радиусе окружности
        
        Args:
            center_lat: Широта центра
            center_lon: Долгота центра
            radius_meters: Радиус в метрах
            category_filters: Список slug категорий для фильтрации (None = все категории)
        
        Returns:
            dict: {
                'health_index': float,  # Индекс здоровья (0-100)
                'analysis_type': 'radius',
                'area_name': str,  # Название области (если определено)
                'category_stats': dict,  # Статистика по категориям
                'objects': list,  # Список объектов с базовыми параметрами
                'total_count': int,  # Общее количество объектов
            }
        """
        # Фильтры по категориям уже применяются в get_pois_in_radius
        pois = self.get_pois_in_radius(center_lat, center_lon, radius_meters, category_filters)
        
        # Рассчитываем индекс здоровья
        health_index = self.health_calculator.calculate_area_index(pois)
        
        # Формируем статистику по категориям
        category_stats = self._get_category_stats(pois)
        
        # Формируем список объектов
        objects_list = self._format_pois_list(pois)
        
        # Получаем название области через обратное геокодирование
        area_name = self.geocoder.get_area_name(
            float(center_lat),
            float(center_lon),
            analysis_type='radius'
        )
        
        return {
            'health_index': health_index,
            'analysis_type': 'radius',
            'area_name': area_name,
            'category_stats': category_stats,
            'objects': objects_list,
            'total_count': pois.count(),
            'area_params': {
                'center_lat': float(center_lat),
                'center_lon': float(center_lon),
                'radius_meters': radius_meters,
            }
        }
    
    def analyze_bounding_box(self, sw_lat, sw_lon, ne_lat, ne_lon, 
                            category_filters=None, analysis_type='city'):
        """
        Анализ области по bounding box (город/улица)
        
        Args:
            sw_lat: Широта юго-западного угла
            sw_lon: Долгота юго-западного угла
            ne_lat: Широта северо-восточного угла
            ne_lon: Долгота северо-восточного угла
            category_filters: Список slug категорий для фильтрации
            analysis_type: 'city' или 'street'
        
        Returns:
            dict: Результат анализа аналогично analyze_radius()
        """
        pois = self.get_pois_in_bbox(sw_lat, sw_lon, ne_lat, ne_lon)
        
        # Применяем фильтры по категориям
        if category_filters:
            # Поддержка категорий без slug - фильтруем по slug или uuid
            from django.db.models import Q
            filter_conditions = Q()
            for filter_slug in category_filters:
                # Пробуем найти по slug или по uuid
                filter_conditions |= Q(category__slug=filter_slug) | Q(category__uuid=filter_slug)
            pois = pois.filter(filter_conditions)
        
        # Рассчитываем индекс здоровья
        health_index = self.health_calculator.calculate_area_index(pois)
        
        # Формируем статистику по категориям
        category_stats = self._get_category_stats(pois)
        
        # Формируем список объектов
        objects_list = self._format_pois_list(pois)
        
        # Вычисляем центр области для обратного геокодирования
        center_lat = (float(sw_lat) + float(ne_lat)) / 2.0
        center_lon = (float(sw_lon) + float(ne_lon)) / 2.0
        
        # Получаем название области через обратное геокодирование
        area_name = self.geocoder.get_area_name(
            center_lat,
            center_lon,
            analysis_type=analysis_type
        )
        
        return {
            'health_index': health_index,
            'analysis_type': analysis_type,
            'area_name': area_name,
            'category_stats': category_stats,
            'objects': objects_list,
            'total_count': pois.count(),
            'area_params': {
                'sw_lat': float(sw_lat),
                'sw_lon': float(sw_lon),
                'ne_lat': float(ne_lat),
                'ne_lon': float(ne_lon),
            }
        }
    
    def get_pois_in_radius(self, center_lat, center_lon, radius_meters, category_filters=None):
        """
        Получить все POI в радиусе от центра
        
        Использует OpenSearch для точного геопространственного запроса.
        Если OpenSearch недоступен, использует fallback на Django ORM.
        
        Args:
            center_lat: Широта центра
            center_lon: Долгота центра
            radius_meters: Радиус в метрах
            category_filters: Список slug категорий для фильтрации (опционально)
        
        Returns:
            QuerySet: POI в радиусе
        """
        # Используем OpenSearch для точного поиска
        if self.opensearch.enabled:
            try:
                search_results = self.opensearch.search_in_radius(
                    float(center_lat),
                    float(center_lon),
                    float(radius_meters),
                    category_filters
                )
                
                logger.info(f'OpenSearch нашел {len(search_results)} POI в радиусе {radius_meters}м от ({center_lat}, {center_lon})')
                
                if not search_results:
                    logger.warning('OpenSearch вернул пустой результат, проверяем индексацию')
                    # Проверяем, есть ли вообще POI в индексе
                    # Если нет - используем fallback
                    return self._get_pois_in_radius_fallback(center_lat, center_lon, radius_meters, category_filters)
                
                # Получаем UUID из результатов
                poi_uuids = [result['uuid'] for result in search_results]
                
                # Возвращаем QuerySet с POI по UUID
                # Дополнительно фильтруем по статусу модерации на случай если в OpenSearch не все индексировано
                pois = POI.objects.filter(
                    uuid__in=poi_uuids,
                    is_active=True,
                    moderation_status='approved'
                ).select_related('category', 'rating')
                
                logger.info(f'Найдено {pois.count()} активных одобренных POI из {len(poi_uuids)} результатов OpenSearch')
                return pois
            except Exception as e:
                logger.error(f'Ошибка при использовании OpenSearch для поиска в радиусе: {str(e)}', exc_info=True)
                # Fallback на Django ORM
                return self._get_pois_in_radius_fallback(center_lat, center_lon, radius_meters, category_filters)
        
        # Fallback на старый метод если OpenSearch недоступен
        return self._get_pois_in_radius_fallback(center_lat, center_lon, radius_meters, category_filters)
    
    def _get_pois_in_radius_fallback(self, center_lat, center_lon, radius_meters, category_filters=None):
        """
        Fallback метод для поиска POI в радиусе через Django ORM
        """
        # Получаем все активные POI
        # Показываем только активные и одобренные места
        pois = POI.objects.filter(
            is_active=True, 
            moderation_status='approved'
        ).select_related('category', 'rating')
        
        # Фильтруем по категориям если указаны
        if category_filters:
            pois = pois.filter(category__slug__in=category_filters)
        
        # Фильтруем по радиусу
        # Для эффективности сначала применяем приблизительный фильтр по координатам
        # Используем описанный квадрат вокруг окружности (диагональ квадрата = диаметр окружности)
        # Это гарантирует, что все точки в окружности попадут в квадрат
        
        # Приблизительный радиус в градусах (1 градус ≈ 111 км)
        # Используем диагональ квадрата = диаметр окружности для гарантии покрытия
        # Диагональ квадрата = сторона * sqrt(2), поэтому сторона = радиус * 2 / sqrt(2) = радиус * sqrt(2)
        approx_radius_deg = (radius_meters * 1.414) / 111000.0  # sqrt(2) ≈ 1.414
        
        # Приблизительный фильтр (квадрат вокруг центра, описанный вокруг окружности)
        pois = pois.filter(
            latitude__gte=float(center_lat) - approx_radius_deg,
            latitude__lte=float(center_lat) + approx_radius_deg,
            longitude__gte=float(center_lon) - approx_radius_deg,
            longitude__lte=float(center_lon) + approx_radius_deg,
        )
        
        # Точная фильтрация по радиусу для всех точек в квадрате
        pois_in_radius = []
        center_point = (float(center_lat), float(center_lon))
        
        for poi in pois:
            try:
                poi_point = (float(poi.latitude), float(poi.longitude))
                distance = geodesic(center_point, poi_point).meters
                if distance <= float(radius_meters):
                    pois_in_radius.append(poi.id)
            except (ValueError, TypeError) as e:
                # Пропускаем POI с невалидными координатами
                continue
        
        return POI.objects.filter(id__in=pois_in_radius).select_related('category', 'rating')
    
    def get_pois_in_bbox(self, sw_lat, sw_lon, ne_lat, ne_lon):
        """
        Получить все POI в bounding box
        
        Args:
            sw_lat: Широта юго-западного угла
            sw_lon: Долгота юго-западного угла
            ne_lat: Широта северо-восточного угла
            ne_lon: Долгота северо-восточного угла
        
        Returns:
            QuerySet: POI в bounding box
        """
        # Возвращаем только активные и одобренные места
        return POI.objects.filter(
            is_active=True,
            moderation_status='approved',
            latitude__gte=float(sw_lat),
            latitude__lte=float(ne_lat),
            longitude__gte=float(sw_lon),
            longitude__lte=float(ne_lon)
        ).select_related('category', 'rating')
    
    def _get_category_stats(self, pois):
        """
        Получить статистику по категориям для выборки POI
        
        Args:
            pois: QuerySet POI
        
        Returns:
            dict: Статистика по категориям
        """
        stats = {}
        for poi in pois.select_related('category', 'rating'):
            if not poi.category:
                continue
                
            # Используем getattr для поддержки категорий без slug
            category_slug = getattr(poi.category, 'slug', None) or str(poi.category.uuid)
            
            if category_slug not in stats:
                stats[category_slug] = {
                    'name': poi.category.name,
                    'count': 0,
                    'average_health_score': 0.0,
                    'total_health_score': 0.0,
                }
            
            stats[category_slug]['count'] += 1
            if poi.rating:
                stats[category_slug]['total_health_score'] += poi.rating.health_score
        
        # Рассчитываем средние значения
        for category_slug, data in stats.items():
            if data['count'] > 0:
                data['average_health_score'] = round(data['total_health_score'] / data['count'], 2)
            del data['total_health_score']
        
        return stats
    
    def _format_pois_list(self, pois, limit=100):
        """
        Форматировать список POI для ответа API
        
        Args:
            pois: QuerySet POI
            limit: Максимальное количество объектов в списке
        
        Returns:
            list: Список словарей с базовыми параметрами объектов
        """
        objects_list = []
        for poi in pois.select_related('category', 'rating')[:limit]:
            if not poi.category:
                continue
                
            # Используем getattr для поддержки категорий без slug
            category_slug = getattr(poi.category, 'slug', None) or str(poi.category.uuid)
            
            objects_list.append({
                'uuid': str(poi.uuid),
                'name': poi.name,
                'category': {
                    'slug': category_slug,
                    'name': poi.category.name,
                    'marker_color': getattr(poi.category, 'marker_color', '#3498db'),
                },
                'address': poi.address,
                'latitude': float(poi.latitude),
                'longitude': float(poi.longitude),
                'health_score': round(poi.rating.health_score, 2) if poi.rating else 50.0,
            })
        
        return objects_list

