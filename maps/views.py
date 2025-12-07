"""
Views для REST API модуля карт

Реализует эндпоинты для:
- Получения списка POI для карты
- Детальной информации о POI
- Анализа области (единый эндпоинт для всех режимов)
- Получения категорий для фильтров
"""

from rest_framework import viewsets, status, permissions, serializers as drf_serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.conf import settings
from django.db import transaction
import pandas as pd
import logging
from decimal import Decimal, InvalidOperation
from typing import Dict, Any, List

from django.contrib.auth.models import User
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
        
        # Получаем категории для фильтрации (теперь по UUID)
        categories_str = request.query_params.get('categories', '')
        category_uuids = [c.strip() for c in categories_str.split(',')] if categories_str else None
        
        try:
            # Получаем POI
            filter_service = POIFilterService()
            bbox = {'sw_lat': sw_lat, 'sw_lon': sw_lon, 'ne_lat': ne_lat, 'ne_lon': ne_lon}
            pois = filter_service.get_filtered_pois(category_uuids=category_uuids, bbox=bbox)
            
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


class POICategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet для категорий POI
    
    Эндпоинты:
    - GET /api/maps/categories/ - список категорий (публичный доступ)
    - GET /api/maps/categories/{uuid}/ - детали категории (публичный доступ)
    - POST /api/maps/categories/ - создать категорию (только администраторы)
    - PUT /api/maps/categories/{uuid}/ - обновить категорию (только администраторы)
    - DELETE /api/maps/categories/{uuid}/ - удалить категорию (только администраторы)
    - GET /api/maps/categories/{uuid}/schema/ - получить схему анкеты категории
    - PUT /api/maps/categories/{uuid}/schema/ - обновить схему анкеты категории
    """
    queryset = POICategory.objects.all()
    serializer_class = POICategorySerializer
    lookup_field = 'uuid'
    
    def get_permissions(self):
        """
        Права доступа:
        - Чтение (GET): публичный доступ
        - Создание/обновление/удаление: только администраторы
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'schema':
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]
    
    def create(self, request, *args, **kwargs):
        """
        Переопределяем create для лучшей обработки ошибок
        """
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f'Создание категории. Пользователь: {request.user}, Данные: {request.data}')
        
        # Проверяем права доступа
        if not request.user.is_authenticated:
            logger.warning('Попытка создания категории неавторизованным пользователем')
            return Response(
                {'error': 'Требуется авторизация'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not (request.user.is_staff or request.user.is_superuser):
            logger.warning(f'Попытка создания категории пользователем без прав: {request.user.username}')
            return Response(
                {'error': 'Недостаточно прав. Требуются права администратора'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            category = serializer.save()
            logger.info(f'Категория создана успешно: {category.uuid} - {category.name}')
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            from rest_framework import serializers
            if isinstance(e, serializers.ValidationError):
                logger.error(f'Ошибка валидации при создании категории: {e.detail}')
                return Response(
                    {'error': 'Ошибка валидации', 'details': e.detail},
                    status=status.HTTP_400_BAD_REQUEST
                )
            logger.error(f'Ошибка при создании категории: {str(e)}', exc_info=True)
            error_message = str(e)
            if hasattr(e, 'detail'):
                error_message = e.detail
            elif hasattr(e, 'message_dict'):
                error_message = e.message_dict
            return Response(
                {'error': f'Ошибка создания категории: {error_message}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def get_queryset(self):
        """
        Фильтр категорий для чтения - только активные
        Для администраторов - все категории
        """
        if self.action in ['list', 'retrieve']:
            return POICategory.objects.filter(is_active=True)
        return POICategory.objects.all()
    
    @action(detail=True, methods=['get', 'put'], permission_classes=[permissions.IsAuthenticated])
    def schema(self, request, uuid=None):
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
    - use_sheet_as_category: boolean (опционально, default=False)
        Если True, каждый лист Excel = категория (название листа = название категории)
        Если False, используется один лист с колонкой "категория"
    
    Формат Excel файла:
    Режим 1 (use_sheet_as_category=False):
    - Обязательные колонки: название, адрес, широта, долгота, категория
    - Опциональные колонки: описание, телефон, сайт, email, время_работы
    
    Режим 2 (use_sheet_as_category=True):
    - Каждый лист Excel = одна категория (название листа = категория)
    - Обязательные колонки: название, адрес, широта, долгота
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
        
        # Получаем опции
        auto_create_categories = request.data.get('auto_create_categories', 'false').lower() == 'true'
        use_sheet_as_category = request.data.get('use_sheet_as_category', 'false').lower() == 'true'
        
        # Статистика
        stats = {
            'total': 0,
            'created': 0,
            'errors': 0,
            'errors_details': [],
            'categories_created': [],
            'sheets_processed': 0
        }
        
        try:
            # Если используем листы как категории - обрабатываем каждый лист отдельно
            if use_sheet_as_category:
                return self._process_multiple_sheets(file, auto_create_categories, stats, request.user)
            else:
                return self._process_single_sheet(file, auto_create_categories, stats, request.user)
            
        except Exception as e:
            logger.error(f"Ошибка при обработке Excel файла: {e}")
            return Response(
                {
                    'error': f'Ошибка при обработке файла: {str(e)}',
                    'stats': stats
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _process_multiple_sheets(self, file, auto_create_categories, stats, user):
        """Обработать файл с несколькими листами (каждый лист = категория)"""
        import pandas as pd
        
        # Получаем все листы
        excel_file = pd.ExcelFile(file, engine='openpyxl' if file.name.endswith('.xlsx') else None)
        sheet_names = excel_file.sheet_names
        
        if not sheet_names:
            return Response(
                {'error': 'Файл не содержит листов'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Обрабатываем каждый лист
        for sheet_name in sheet_names:
            try:
                # Читаем лист
                df = pd.read_excel(excel_file, sheet_name=sheet_name, engine='openpyxl' if file.name.endswith('.xlsx') else None)
                
                if df.empty:
                    logger.warning(f"Лист '{sheet_name}' пуст, пропускаем")
                    continue
                
                stats['sheets_processed'] += 1
                sheet_total = len(df)
                stats['total'] += sheet_total
                
                # Нормализуем названия колонок
                df.columns = df.columns.str.strip().str.lower()
                
                # Определяем маппинг колонок
                column_mapping = self._detect_column_mapping(df.columns.tolist())
                
                # Для режима с листами как категориями - колонка категории не нужна
                required_columns = ['name', 'address', 'latitude', 'longitude']
                missing_columns = [col for col in required_columns if col not in column_mapping]
                
                if missing_columns:
                    stats['errors'] += sheet_total
                    stats['errors_details'].append({
                        'sheet': sheet_name,
                        'message': f'Отсутствуют обязательные колонки: {", ".join(missing_columns)}'
                    })
                    continue
                
                # Получаем или создаем категорию по названию листа
                category = self._get_or_create_category(
                    sheet_name.strip(),
                    auto_create_categories,
                    stats
                )
                
                if not category:
                    stats['errors'] += sheet_total
                    stats['errors_details'].append({
                        'sheet': sheet_name,
                        'message': f'Категория "{sheet_name}" не найдена и не может быть создана'
                    })
                    continue
                
                # Обрабатываем каждую строку листа
                for index, row in df.iterrows():
                    try:
                        poi_data = self._extract_poi_data(row, column_mapping, category_name=sheet_name.strip())
                        
                        # Создаем POI с использованием Gigachat для описания и S_infra
                        with transaction.atomic():
                            poi = self._create_poi_with_gigachat(poi_data, category, user)
                            stats['created'] += 1
                            
                    except Exception as e:
                        stats['errors'] += 1
                        error_message = str(e)
                        logger.error(f"Ошибка при создании POI из листа '{sheet_name}', строка {index + 2}: {error_message}")
                        stats['errors_details'].append({
                            'sheet': sheet_name,
                            'row': index + 2,
                            'message': error_message
                        })
                        
            except Exception as e:
                error_message = f"Ошибка при обработке листа '{sheet_name}': {str(e)}"
                logger.error(error_message)
                stats['errors_details'].append({
                    'sheet': sheet_name,
                    'message': error_message
                })
        
        return Response(stats, status=status.HTTP_200_OK)
    
    def _process_single_sheet(self, file, auto_create_categories, stats, user):
        """Обработать файл с одним листом (колонка категории обязательна)"""
        # Читаем Excel файл (первый лист по умолчанию)
        df = pd.read_excel(file, engine='openpyxl' if file.name.endswith('.xlsx') else None)
        
        if df.empty:
            return Response(
                {'error': 'Файл пуст или не содержит данных'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stats['total'] = len(df)
        stats['sheets_processed'] = 1
        
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
                
                # Создаем POI с использованием Gigachat для описания и S_infra
                with transaction.atomic():
                    poi = self._create_poi_with_gigachat(poi_data, category, user)
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
        name_variants = ['название', 'name', 'имя', 'наименование', 'cfname']
        address_variants = ['адрес', 'address', 'адресс', 'cfaddress']
        lat_variants = ['широта', 'latitude', 'lat', 'координата_широта', 'cflatitude']
        lon_variants = ['долгота', 'longitude', 'lon', 'lng', 'координата_долгота', 'cflongitude']
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
    
    def _extract_poi_data(self, row: pd.Series, column_mapping: Dict[str, str], category_name: str = None) -> Dict[str, Any]:
        """
        Извлечь данные POI из строки Excel
        
        Args:
            row: Строка DataFrame
            column_mapping: Маппинг колонок
            category_name: Название категории (если передано, используется вместо колонки)
            
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
        
        # Категория - либо из параметра, либо из колонки
        if category_name:
            data['category'] = category_name
        elif 'category' in column_mapping:
            data['category'] = str(row[column_mapping['category']]).strip()
        else:
            raise ValueError('Категория не указана')
        
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
        
        # Если не найдено и разрешено создание
        if auto_create:
            category = POICategory.objects.create(
                name=category_name,
                is_active=True,
                marker_color='#FF0000',  # Дефолтный цвет
                display_order=0
            )
            stats['categories_created'].append(category_name)
            logger.info(f"Создана категория: {category_name}")
            return category
        
        return None
    
    def _create_poi_with_gigachat(self, poi_data: Dict[str, Any], category: POICategory, user: User) -> POI:
        """
        Создать POI с генерацией описания и расчетом S_infra через Gigachat
        
        Args:
            poi_data: Данные для создания POI
            category: Категория объекта
            user: Пользователь, создающий объект
            
        Returns:
            POI: Созданный объект
        """
        from maps.services.llm_service import LLMService
        from maps.services.infrastructure_score_calculator import InfrastructureScoreCalculator
        
        llm_service = LLMService()
        infra_calculator = InfrastructureScoreCalculator()
        
        # Формируем полные данные для Gigachat
        full_data = {
            'название': poi_data.get('name', ''),
            'адрес': poi_data.get('address', ''),
            **{k: v for k, v in poi_data.items() if k not in ['name', 'address', 'latitude', 'longitude', 'category'] and v}
        }
        
        # Генерируем описание через Gigachat
        description = poi_data.get('description', '')
        if not description or len(description.strip()) < 10:
            # Если описания нет или оно слишком короткое - генерируем через Gigachat
            try:
                description = llm_service.generate_description_from_data(full_data, category.name)
            except Exception as e:
                logger.warning(f'Ошибка генерации описания через Gigachat: {e}')
                # Fallback на базовое описание
                description = f"{poi_data.get('name', 'Объект')}. {poi_data.get('address', '')}"
        
        # Рассчитываем S_infra через Gigachat
        s_infra_result = infra_calculator.calculate_from_description(
            description=description,
            category_name=category.name,
            additional_data={
                'адрес': poi_data.get('address', ''),
                'название': poi_data.get('name', ''),
            }
        )
        
        # Создаем POI
        poi = POI.objects.create(
            name=poi_data['name'],
            address=poi_data['address'],
            latitude=Decimal(str(poi_data['latitude'])),
            longitude=Decimal(str(poi_data['longitude'])),
            category=category,
            description=description,
            phone=poi_data.get('phone', ''),
            website=poi_data.get('website', ''),
            email=poi_data.get('email', ''),
            working_hours=poi_data.get('working_hours', ''),
            moderation_status='approved',
            is_active=True,
            submitted_by=user,
            verified=True,
            verified_by=user,
            verified_at=timezone.now(),
            metadata={
                's_infra_calculation': {
                    's_infra': s_infra_result.get('s_infra', 50.0),
                    'confidence': s_infra_result.get('confidence', 0.0),
                    'reasoning': s_infra_result.get('reasoning', ''),
                    'red_flags': s_infra_result.get('red_flags', []),
                    'calculated_by': 'gigachat'
                },
                'description_generated': not poi_data.get('description') or len(poi_data.get('description', '').strip()) < 10
            }
        )
        
        # Создаем POIRating с рассчитанным S_infra
        from maps.services.health_impact_score_calculator import HealthImpactScoreCalculator
        rating_calculator = HealthImpactScoreCalculator()
        rating_calculator.calculate_full_rating(poi, save=True)
        
        return poi

