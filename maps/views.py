"""
Views для REST API модуля карт

Реализует эндпоинты для:
- Получения списка POI для карты
- Детальной информации о POI
- Анализа области (единый эндпоинт для всех режимов)
- Получения категорий для фильтров
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.conf import settings

from maps.models import POI, POICategory, POIRating
from maps.serializers import (
    POISerializer, POIListSerializer, POICategorySerializer,
    AreaAnalysisRequestSerializer, AreaAnalysisResponseSerializer
)
from maps.services.area_analysis_service import AreaAnalysisService
from maps.services.poi_filter_service import POIFilterService
from maps.services.health_index_calculator import HealthIndexCalculator
from maps.services.geocoder_service import GeocoderService


class POIViewSet(viewsets.ModelViewSet):
    """
    ViewSet для точек интереса (POI)
    
    Эндпоинты:
    - GET /api/maps/pois/ - список POI (с фильтрацией)
    - GET /api/maps/pois/{uuid}/ - детали POI по UUID
    - POST /api/maps/pois/ - создание POI (требует авторизации)
    - GET /api/maps/pois/in-bbox/ - POI в bounding box
    """
    queryset = POI.objects.filter(is_active=True)
    lookup_field = 'uuid'  # Поиск по UUID вместо id
    
    def get_permissions(self):
        """
        Разрешения:
        - GET: доступно всем
        - POST/PUT/DELETE: требует авторизации
        """
        if self.action in ['list', 'retrieve', 'in_bbox']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
    
    def get_serializer_class(self):
        """
        Выбор serializer в зависимости от действия
        """
        if self.action == 'list':
            return POIListSerializer
        return POISerializer
    
    def get_queryset(self):
        """
        Получить QuerySet с фильтрацией
        
        Поддерживает фильтры:
        - category: slug категории
        - categories: список slug категорий (через запятую)
        - bbox: bounding box (sw_lat,sw_lon,ne_lat,ne_lon)
        """
        queryset = POI.objects.filter(is_active=True).select_related('category', 'rating')
        
        # Фильтр по категории
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category__slug=category)
        
        # Фильтр по нескольким категориям
        categories = self.request.query_params.get('categories', None)
        if categories:
            category_list = [c.strip() for c in categories.split(',')]
            queryset = queryset.filter(category__slug__in=category_list)
        
        # Фильтр по bounding box
        bbox = self.request.query_params.get('bbox', None)
        if bbox:
            try:
                sw_lat, sw_lon, ne_lat, ne_lon = map(float, bbox.split(','))
                queryset = queryset.filter(
                    latitude__gte=sw_lat,
                    latitude__lte=ne_lat,
                    longitude__gte=sw_lon,
                    longitude__lte=ne_lon
                )
            except (ValueError, AttributeError):
                pass  # Игнорируем невалидный bbox
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='in-bbox')
    def in_bbox(self, request):
        """
        Получить POI в bounding box
        
        Query params:
            - sw_lat: Широта юго-западного угла
            - sw_lon: Долгота юго-западного угла
            - ne_lat: Широта северо-восточного угла
            - ne_lon: Долгота северо-восточного угла
            - categories: Список slug категорий (через запятую)
        
        Returns:
            Response со списком POI
        """
        try:
            sw_lat = float(request.query_params.get('sw_lat'))
            sw_lon = float(request.query_params.get('sw_lon'))
            ne_lat = float(request.query_params.get('ne_lat'))
            ne_lon = float(request.query_params.get('ne_lon'))
        except (ValueError, TypeError):
            return Response(
                {'error': 'Неверные параметры bounding box'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получаем категории для фильтрации
        categories_str = request.query_params.get('categories', '')
        category_slugs = [c.strip() for c in categories_str.split(',')] if categories_str else None
        
        try:
            # Получаем POI
            filter_service = POIFilterService()
            bbox = {'sw_lat': sw_lat, 'sw_lon': sw_lon, 'ne_lat': ne_lat, 'ne_lon': ne_lon}
            pois = filter_service.get_filtered_pois(category_slugs=category_slugs, bbox=bbox)
            
            # Получаем количество до сериализации
            count = pois.count()
            
            # Сериализуем
            serializer = POIListSerializer(pois, many=True)
            return Response({
                'count': count,
                'results': serializer.data
            })
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            return Response(
                {
                    'error': f'Ошибка при получении POI: {str(e)}',
                    'trace': error_trace if settings.DEBUG else None
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class POICategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для категорий POI
    
    Эндпоинты:
    - GET /api/maps/categories/ - список категорий
    - GET /api/maps/categories/{id}/ - детали категории
    """
    queryset = POICategory.objects.filter(is_active=True)
    serializer_class = POICategorySerializer
    permission_classes = [permissions.AllowAny]  # Публичный доступ
    lookup_field = 'slug'  # Поиск по slug вместо id


class AreaAnalysisView(APIView):
    """
    View для анализа области
    
    Единый эндпоинт для всех режимов анализа:
    - POST /api/maps/analyze/ - анализ области
    
    Поддерживает три режима:
    1. Радиус: center_lat, center_lon, radius_meters
    2. Город/округ: sw_lat, sw_lon, ne_lat, ne_lon, analysis_type='city'
    3. Улица/квартал: sw_lat, sw_lon, ne_lat, ne_lon, analysis_type='street'
    """
    permission_classes = [permissions.AllowAny]  # Публичный доступ
    
    def post(self, request):
        """
        Выполнить анализ области
        
        Body:
            {
                "analysis_type": "radius" | "city" | "street",
                "center_lat": float (для radius),
                "center_lon": float (для radius),
                "radius_meters": int (для radius),
                "sw_lat": float (для city/street),
                "sw_lon": float (для city/street),
                "ne_lat": float (для city/street),
                "ne_lon": float (для city/street),
                "category_filters": ["slug1", "slug2"] (опционально)
            }
        
        Returns:
            Response с результатами анализа
        """
        # Валидация запроса
        request_serializer = AreaAnalysisRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        
        validated_data = request_serializer.validated_data
        analysis_type = validated_data.get('analysis_type', 'city')
        category_filters = validated_data.get('category_filters', None)
        
        # Инициализация сервисов
        analysis_service = AreaAnalysisService()
        health_calculator = HealthIndexCalculator()
        
        # Выполнение анализа в зависимости от режима
        if analysis_type == 'radius':
            result = analysis_service.analyze_radius(
                center_lat=validated_data['center_lat'],
                center_lon=validated_data['center_lon'],
                radius_meters=validated_data['radius_meters'],
                category_filters=category_filters
            )
        else:  # city или street
            result = analysis_service.analyze_bounding_box(
                sw_lat=validated_data['sw_lat'],
                sw_lon=validated_data['sw_lon'],
                ne_lat=validated_data['ne_lat'],
                ne_lon=validated_data['ne_lon'],
                category_filters=category_filters,
                analysis_type=analysis_type
            )
        
        # Добавляем текстовую интерпретацию
        result['health_interpretation'] = health_calculator.interpret_health_index(
            result['health_index']
        )
        
        # Сериализуем результат
        response_serializer = AreaAnalysisResponseSerializer(data=result)
        response_serializer.is_valid(raise_exception=True)
        
        return Response(response_serializer.validated_data, status=status.HTTP_200_OK)


class GeocoderView(APIView):
    """
    View для геокодирования адресов
    
    Эндпоинты:
    - POST /api/maps/geocode/ - прямое геокодирование (адрес -> координаты)
    - POST /api/maps/reverse-geocode/ - обратное геокодирование (координаты -> адрес)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Прямое геокодирование: адрес -> координаты
        
        Body:
            {
                "address": "Москва, Красная площадь, 1"
            }
        
        Returns:
            Response с координатами и компонентами адреса
        """
        address = request.data.get('address')
        
        if not address:
            return Response(
                {'error': 'Поле "address" обязательно'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        geocoder = GeocoderService()
        result = geocoder.geocode_address(address)
        
        if not result:
            return Response(
                {'error': 'Не удалось геокодировать адрес'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(result, status=status.HTTP_200_OK)


class ReverseGeocoderView(APIView):
    """
    View для обратного геокодирования
    """
    permission_classes = [permissions.AllowAny]  # Публичный доступ для карты
    
    def post(self, request):
        """
        Обратное геокодирование: координаты -> адрес
        
        Body:
            {
                "latitude": 55.7558,
                "longitude": 37.6173
            }
        
        Returns:
            Response с адресом и компонентами
        """
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        
        if latitude is None or longitude is None:
            return Response(
                {'error': 'Поля "latitude" и "longitude" обязательны'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Координаты должны быть числами'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        geocoder = GeocoderService()
        result = geocoder.reverse_geocode(latitude, longitude)
        
        if not result:
            return Response(
                {'error': 'Не удалось получить адрес для указанных координат'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(result, status=status.HTTP_200_OK)

