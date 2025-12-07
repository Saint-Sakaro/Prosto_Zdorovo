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
from django.utils.text import slugify
from django.db import transaction
import pandas as pd
import logging
from decimal import Decimal, InvalidOperation
from typing import Dict, Any, List

from maps.models import POI, POICategory, POIRating, FormSchema
from maps.serializers import (
    POISerializer, POIListSerializer, POICategorySerializer,
    AreaAnalysisRequestSerializer, AreaAnalysisResponseSerializer,
    POISubmissionSerializer
)
from maps.serializers_ratings import FormSchemaSerializer
from maps.services.area_analysis_service import AreaAnalysisService
from maps.services.poi_filter_service import POIFilterService
from maps.services.health_index_calculator import HealthIndexCalculator
from maps.services.geocoder_service import GeocoderService
from maps.services.health_impact_score_calculator import HealthImpactScoreCalculator
from gamification.permissions import IsModerator
from django.utils import timezone

logger = logging.getLogger(__name__)


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
    - GET /api/maps/categories/{slug}/ - детали категории
    - GET /api/maps/categories/{slug}/schema/ - получить схему анкеты категории
    - PUT /api/maps/categories/{slug}/schema/ - обновить схему анкеты категории
    """
    queryset = POICategory.objects.filter(is_active=True)
    serializer_class = POICategorySerializer
    permission_classes = [permissions.AllowAny]  # Публичный доступ
    lookup_field = 'slug'  # Поиск по slug вместо id
    
    @action(detail=True, methods=['get', 'put'], permission_classes=[permissions.IsAuthenticated])
    def schema(self, request, slug=None):
        """
        Получить или обновить схему анкеты для категории
        
        GET: Получить схему анкеты
        PUT: Обновить схему анкеты (только для авторизованных)
        """
        category = self.get_object()
        
        # Получаем или создаем схему
        try:
            form_schema = category.form_schema
        except FormSchema.DoesNotExist:
            # Если схемы нет, возвращаем 404 для GET или создаем для PUT
            if request.method == 'GET':
                return Response(
                    {'error': 'Схема анкеты не найдена для этой категории'},
                    status=status.HTTP_404_NOT_FOUND
                )
            # Для PUT создаем новую схему
            form_schema = FormSchema.objects.create(
                category=category,
                name=f'Схема для {category.name}',
                schema_json={'fields': [], 'version': '1.0'},
                status='draft'
            )
        
        if request.method == 'GET':
            # Возвращаем схему
            serializer = FormSchemaSerializer(form_schema)
            return Response(serializer.data)
        
        elif request.method == 'PUT':
            # Обновляем схему
            # Проверяем права (только модераторы или владельцы)
            if not (request.user.is_staff or request.user.is_superuser):
                return Response(
                    {'error': 'Недостаточно прав для обновления схемы'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = FormSchemaSerializer(form_schema, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


class POISubmissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet для заявок на создание мест
    
    Эндпоинты:
    - POST /api/maps/pois/submissions/ - создать заявку
    - GET /api/maps/pois/submissions/ - список заявок пользователя
    - GET /api/maps/pois/submissions/{uuid}/ - детали заявки
    - GET /api/maps/pois/submissions/pending/ - список заявок на модерацию (модераторы)
    - POST /api/maps/pois/submissions/{uuid}/moderate/ - модерировать заявку (модераторы)
    """
    queryset = POI.objects.filter(moderation_status='pending')
    serializer_class = POISubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'uuid'
    
    def get_queryset(self):
        """
        Фильтровать заявки по пользователю (для обычных пользователей)
        Для модераторов - показывать все заявки
        """
        queryset = POI.objects.filter(moderation_status='pending')
        
        # Если пользователь - модератор, показываем все заявки
        if self.request.user.is_staff:
            return queryset
        
        # Для обычных пользователей - только свои заявки
        return queryset.filter(submitted_by=self.request.user)
    
    def perform_create(self, serializer):
        """
        Создать заявку с автоматической проверкой LLM (опционально)
        """
        # Сериализатор уже сохраняет submitted_by через create()
        poi = serializer.save()
        
        # TODO: Отправить на проверку LLM (асинхронно через Celery)
        # Можно добавить задачу: check_poi_with_llm.delay(poi.id)
    
    @action(detail=False, methods=['get'], permission_classes=[IsModerator])
    def pending(self, request):
        """
        Получить список заявок на модерацию (только для модераторов)
        
        Returns:
            Response со списком заявок со статусом pending
        """
        pending_pois = POI.objects.filter(moderation_status='pending').order_by('-created_at')
        serializer = POISerializer(pending_pois, many=True)
        return Response({
            'count': pending_pois.count(),
            'results': serializer.data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsModerator])
    def moderate(self, request, uuid=None):
        """
        Модерировать заявку (только для модераторов)
        
        Body:
            {
                "action": "approve|reject|request_changes",
                "comment": "..."
            }
        
        Returns:
            Response с обновленным объектом POI
        """
        poi = self.get_object()
        action = request.data.get('action')
        comment = request.data.get('comment', '')
        
        if action not in ['approve', 'reject', 'request_changes']:
            return Response(
                {'error': 'Действие должно быть: approve, reject или request_changes'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Обновляем статус модерации
        if action == 'approve':
            poi.moderation_status = 'approved'
            poi.is_active = True
            poi.moderated_by = request.user
            poi.moderated_at = timezone.now()
            poi.moderation_comment = comment
            
            # Рассчитываем полный рейтинг
            calculator = HealthImpactScoreCalculator()
            calculator.calculate_full_rating(poi, save=True)
            
        elif action == 'reject':
            poi.moderation_status = 'rejected'
            poi.is_active = False
            poi.moderated_by = request.user
            poi.moderated_at = timezone.now()
            poi.moderation_comment = comment
            
        elif action == 'request_changes':
            poi.moderation_status = 'changes_requested'
            poi.moderated_by = request.user
            poi.moderated_at = timezone.now()
            poi.moderation_comment = comment
        
        poi.save()
        
        serializer = POISerializer(poi)
        return Response(serializer.data)


class BulkUploadPOIView(APIView):
    """
    View для массовой загрузки POI из Excel файла
    
    Эндпоинт:
    - POST /api/maps/pois/bulk-upload/
    
    Body (FormData):
    - file: Excel файл (.xlsx или .xls)
    - auto_create_categories: boolean (опционально, default=False)
    
    Формат Excel файла:
    - Обязательные колонки: название, адрес, широта, долгота, категория
    - Опциональные колонки: описание, телефон, сайт, email, время_работы
    """
    permission_classes = [IsModerator]  # Только для модераторов
    
    def post(self, request):
        """
        Обработать массовую загрузку POI из Excel файла
        
        Returns:
            Response со статистикой загрузки
        """
        # Проверяем наличие файла
        if 'file' not in request.FILES:
            return Response(
                {'error': 'Файл не предоставлен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        
        # Проверяем расширение файла
        if not file.name.endswith(('.xlsx', '.xls')):
            return Response(
                {'error': 'Файл должен быть в формате Excel (.xlsx или .xls)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получаем опцию автоматического создания категорий
        auto_create_categories = request.data.get('auto_create_categories', 'false').lower() == 'true'
        
        # Статистика
        stats = {
            'total': 0,
            'created': 0,
            'errors': 0,
            'errors_details': [],
            'categories_created': []
        }
        
        try:
            # Читаем Excel файл
            df = pd.read_excel(file, engine='openpyxl' if file.name.endswith('.xlsx') else None)
            
            if df.empty:
                return Response(
                    {'error': 'Файл пуст или не содержит данных'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            stats['total'] = len(df)
            
            # Нормализуем названия колонок (приводим к нижнему регистру, убираем пробелы)
            df.columns = df.columns.str.strip().str.lower()
            
            # Определяем маппинг колонок
            column_mapping = self._detect_column_mapping(df.columns.tolist())
            
            # Проверяем наличие обязательных колонок
            required_columns = ['name', 'address', 'latitude', 'longitude', 'category']
            missing_columns = [col for col in required_columns if col not in column_mapping]
            
            if missing_columns:
                return Response(
                    {
                        'error': f'Отсутствуют обязательные колонки: {", ".join(missing_columns)}',
                        'available_columns': list(df.columns)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Обрабатываем каждую строку
            for index, row in df.iterrows():
                try:
                    poi_data = self._extract_poi_data(row, column_mapping)
                    
                    # Получаем или создаем категорию
                    category = self._get_or_create_category(
                        poi_data['category'],
                        auto_create_categories,
                        stats
                    )
                    
                    if not category:
                        stats['errors'] += 1
                        stats['errors_details'].append({
                            'row': index + 2,  # +2 потому что индекс с 0, и есть заголовок
                            'message': f'Категория "{poi_data["category"]}" не найдена'
                        })
                        continue
                    
                    # Создаем POI
                    with transaction.atomic():
                        poi = POI.objects.create(
                            name=poi_data['name'],
                            address=poi_data['address'],
                            latitude=Decimal(str(poi_data['latitude'])),
                            longitude=Decimal(str(poi_data['longitude'])),
                            category=category,
                            description=poi_data.get('description', ''),
                            phone=poi_data.get('phone', ''),
                            website=poi_data.get('website', ''),
                            email=poi_data.get('email', ''),
                            working_hours=poi_data.get('working_hours', ''),
                            moderation_status='approved',  # Автоматически одобряем при bulk upload
                            is_active=True,
                            submitted_by=request.user,
                            verified=True,
                            verified_by=request.user,
                            verified_at=timezone.now(),
                            form_data=poi_data.get('form_data', {})
                        )
                        
                        stats['created'] += 1
                        
                except Exception as e:
                    stats['errors'] += 1
                    error_message = str(e)
                    logger.error(f"Ошибка при создании POI из строки {index + 2}: {error_message}")
                    stats['errors_details'].append({
                        'row': index + 2,
                        'message': error_message
                    })
            
            return Response(stats, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Ошибка при обработке Excel файла: {e}")
            return Response(
                {
                    'error': f'Ошибка при обработке файла: {str(e)}',
                    'stats': stats
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _detect_column_mapping(self, columns: List[str]) -> Dict[str, str]:
        """
        Определить маппинг колонок Excel на поля POI
        
        Args:
            columns: Список названий колонок из Excel
            
        Returns:
            dict: Маппинг {поле_poi: название_колонки_excel}
        """
        mapping = {}
        
        # Варианты названий для каждого поля
        name_variants = ['название', 'name', 'имя', 'наименование']
        address_variants = ['адрес', 'address', 'адресс']
        lat_variants = ['широта', 'latitude', 'lat', 'координата_широта']
        lon_variants = ['долгота', 'longitude', 'lon', 'lng', 'координата_долгота']
        category_variants = ['категория', 'category', 'тип', 'вид']
        description_variants = ['описание', 'description', 'desc']
        phone_variants = ['телефон', 'phone', 'tel', 'телефон_контакт']
        website_variants = ['сайт', 'website', 'url', 'веб_сайт']
        email_variants = ['email', 'почта', 'e-mail', 'электронная_почта']
        working_hours_variants = ['время_работы', 'working_hours', 'часы_работы', 'режим_работы']
        
        variants_map = {
            'name': name_variants,
            'address': address_variants,
            'latitude': lat_variants,
            'longitude': lon_variants,
            'category': category_variants,
            'description': description_variants,
            'phone': phone_variants,
            'website': website_variants,
            'email': email_variants,
            'working_hours': working_hours_variants,
        }
        
        # Ищем соответствия
        for field, variants in variants_map.items():
            for col in columns:
                col_lower = col.lower().strip().replace(' ', '_').replace('-', '_')
                if any(variant in col_lower or col_lower in variant for variant in variants):
                    mapping[field] = col
                    break
        
        return mapping
    
    def _extract_poi_data(self, row: pd.Series, column_mapping: Dict[str, str]) -> Dict[str, Any]:
        """
        Извлечь данные POI из строки Excel
        
        Args:
            row: Строка DataFrame
            column_mapping: Маппинг колонок
            
        Returns:
            dict: Данные для создания POI
        """
        data = {}
        
        # Обязательные поля
        data['name'] = str(row[column_mapping['name']]).strip()
        data['address'] = str(row[column_mapping['address']]).strip()
        
        # Координаты
        lat = row[column_mapping['latitude']]
        lon = row[column_mapping['longitude']]
        
        try:
            data['latitude'] = float(lat)
            data['longitude'] = float(lon)
        except (ValueError, TypeError):
            raise ValueError(f'Некорректные координаты: широта={lat}, долгота={lon}')
        
        # Проверка диапазона координат
        if not (-90 <= data['latitude'] <= 90):
            raise ValueError(f'Широта должна быть от -90 до 90, получено: {data["latitude"]}')
        if not (-180 <= data['longitude'] <= 180):
            raise ValueError(f'Долгота должна быть от -180 до 180, получено: {data["longitude"]}')
        
        data['category'] = str(row[column_mapping['category']]).strip()
        
        # Опциональные поля
        if 'description' in column_mapping:
            desc = row[column_mapping['description']]
            data['description'] = str(desc).strip() if pd.notna(desc) else ''
        
        if 'phone' in column_mapping:
            phone = row[column_mapping['phone']]
            data['phone'] = str(phone).strip() if pd.notna(phone) else ''
        
        if 'website' in column_mapping:
            website = row[column_mapping['website']]
            data['website'] = str(website).strip() if pd.notna(website) else ''
        
        if 'email' in column_mapping:
            email = row[column_mapping['email']]
            data['email'] = str(email).strip() if pd.notna(email) else ''
        
        if 'working_hours' in column_mapping:
            hours = row[column_mapping['working_hours']]
            data['working_hours'] = str(hours).strip() if pd.notna(hours) else ''
        
        # Формируем form_data из остальных колонок (кроме уже обработанных)
        form_data = {}
        processed_columns = set(column_mapping.values())
        for col in row.index:
            if col not in processed_columns and pd.notna(row[col]):
                form_data[col] = str(row[col]).strip()
        
        if form_data:
            data['form_data'] = form_data
        
        return data
    
    def _get_or_create_category(
        self,
        category_name: str,
        auto_create: bool,
        stats: Dict[str, Any]
    ) -> POICategory:
        """
        Получить или создать категорию
        
        Args:
            category_name: Название категории
            auto_create: Создавать категорию автоматически, если не найдена
            stats: Словарь со статистикой для обновления
            
        Returns:
            POICategory или None
        """
        # Пытаемся найти по названию
        try:
            return POICategory.objects.get(name=category_name, is_active=True)
        except POICategory.DoesNotExist:
            pass
        
        # Пытаемся найти по slug
        category_slug = slugify(category_name)
        try:
            return POICategory.objects.get(slug=category_slug, is_active=True)
        except POICategory.DoesNotExist:
            pass
        
        # Если не найдено и разрешено создание
        if auto_create:
            category = POICategory.objects.create(
                name=category_name,
                slug=category_slug,
                is_active=True,
                marker_color='#FF0000',  # Дефолтный цвет
                health_weight=1.0,
                health_importance=5,
                display_order=0
            )
            stats['categories_created'].append(category_name)
            logger.info(f"Создана категория: {category_name}")
            return category
        
        return None

