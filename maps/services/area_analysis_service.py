"""
Сервис анализа областей

Реализует логику анализа областей для трех режимов:
- Анализ в радиусе окружности
- Анализ по городу или округу (bounding box)
- Анализ по улице или кварталу (bounding box)
"""

from django.db.models import Q, Count, Avg
from geopy.distance import geodesic
from maps.models import POI, POICategory, POIRating
from maps.services.health_index_calculator import HealthIndexCalculator
from maps.services.geocoder_service import GeocoderService


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
        pois = self.get_pois_in_radius(center_lat, center_lon, radius_meters)
        
        # Применяем фильтры по категориям
        if category_filters:
            pois = pois.filter(category__slug__in=category_filters)
        
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
            pois = pois.filter(category__slug__in=category_filters)
        
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
    
    def get_pois_in_radius(self, center_lat, center_lon, radius_meters):
        """
        Получить все POI в радиусе от центра
        
        Args:
            center_lat: Широта центра
            center_lon: Долгота центра
            radius_meters: Радиус в метрах
        
        Returns:
            QuerySet: POI в радиусе
        """
        # Получаем все активные POI
        pois = POI.objects.filter(is_active=True).select_related('category', 'rating')
        
        # Фильтруем по радиусу
        # Для эффективности сначала применяем приблизительный фильтр по координатам
        # (окружность вписывается в квадрат)
        # Затем точно вычисляем расстояние для оставшихся объектов
        
        # Приблизительный радиус в градусах (1 градус ≈ 111 км)
        approx_radius_deg = radius_meters / 111000.0
        
        # Приблизительный фильтр (квадрат вокруг центра)
        pois = pois.filter(
            latitude__gte=float(center_lat) - approx_radius_deg,
            latitude__lte=float(center_lat) + approx_radius_deg,
            longitude__gte=float(center_lon) - approx_radius_deg,
            longitude__lte=float(center_lon) + approx_radius_deg,
        )
        
        # Точная фильтрация по радиусу
        pois_in_radius = []
        for poi in pois:
            distance = geodesic(
                (float(center_lat), float(center_lon)),
                (float(poi.latitude), float(poi.longitude))
            ).meters
            if distance <= radius_meters:
                pois_in_radius.append(poi.id)
        
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
        return POI.objects.filter(
            is_active=True,
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
            category_slug = poi.category.slug
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
            objects_list.append({
                'uuid': str(poi.uuid),
                'name': poi.name,
                'category': {
                    'slug': poi.category.slug,
                    'name': poi.category.name,
                    'marker_color': poi.category.marker_color,
                },
                'address': poi.address,
                'latitude': float(poi.latitude),
                'longitude': float(poi.longitude),
                'health_score': round(poi.rating.health_score, 2) if poi.rating else 50.0,
            })
        
        return objects_list

