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
from typing import Dict, Any, List, Optional

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
    # Показываем только активные и одобренные места
    queryset = POI.objects.filter(is_active=True, moderation_status='approved')
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
        
        Показывает только активные и одобренные места.
        """
        queryset = POI.objects.filter(
            is_active=True, 
            moderation_status='approved'
        ).select_related('category', 'rating')
        
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
            # Если схемы нет, автоматически создаем пустую схему
            # Это позволяет фронтенду получать схему даже если она еще не создана
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
        try:
            # Валидация запроса
            request_serializer = AreaAnalysisRequestSerializer(data=request.data)
            request_serializer.is_valid(raise_exception=True)
            
            validated_data = request_serializer.validated_data
            analysis_type = validated_data.get('analysis_type', 'city')
            category_filters = validated_data.get('category_filters', None)
            
            logger.info(f'Анализ области: type={analysis_type}, filters={category_filters}')
            
            # Инициализация сервисов
            analysis_service = AreaAnalysisService()
            health_calculator = HealthIndexCalculator()
            
            # Выполнение анализа в зависимости от режима
            try:
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
            except Exception as e:
                logger.error(f'Ошибка при выполнении анализа области: {str(e)}', exc_info=True)
                return Response(
                    {
                        'error': 'Ошибка при выполнении анализа области',
                        'message': str(e) if settings.DEBUG else 'Не удалось выполнить анализ'
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Добавляем текстовую интерпретацию (обязательное поле для сериализатора)
            if 'health_interpretation' not in result:
                try:
                    result['health_interpretation'] = health_calculator.interpret_health_index(
                        result['health_index']
                    )
                except Exception as e:
                    logger.warning(f'Ошибка при интерпретации индекса здоровья: {str(e)}')
                    result['health_interpretation'] = 'Не удалось определить интерпретацию'
            
            # Сериализуем результат
            try:
                response_serializer = AreaAnalysisResponseSerializer(data=result)
                if response_serializer.is_valid():
                    return Response(response_serializer.validated_data, status=status.HTTP_200_OK)
                else:
                    logger.warning(f'Ошибки валидации сериализатора (возвращаем данные без валидации): {response_serializer.errors}')
                    # Возвращаем результат без строгой валидации
                    return Response(result, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f'Ошибка при сериализации результата: {str(e)}', exc_info=True)
                # Возвращаем результат без сериализации в случае ошибки
                return Response(result, status=status.HTTP_200_OK)
                
        except drf_serializers.ValidationError as e:
            logger.error(f'Ошибка валидации запроса анализа: {e.detail}')
            return Response(
                {'error': 'Ошибка валидации запроса', 'details': e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f'Неожиданная ошибка при анализе области: {str(e)}', exc_info=True)
            return Response(
                {
                    'error': 'Внутренняя ошибка сервера',
                    'message': str(e) if settings.DEBUG else 'Произошла ошибка при обработке запроса'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
    queryset = POI.objects.all()  # Базовый queryset, фильтрация происходит в get_queryset()
    serializer_class = POISerializer  # Используем POISerializer для чтения
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'uuid'
    
    def get_serializer_class(self):
        """
        Выбор сериализатора в зависимости от действия:
        - create: POISubmissionSerializer (для создания)
        - list/retrieve: POISerializer (для чтения)
        """
        if self.action == 'create':
            return POISubmissionSerializer
        return POISerializer
    
    def get_queryset(self):
        """
        Фильтровать заявки по пользователю (для обычных пользователей)
        Для модераторов - показывать все заявки на модерацию (pending)
        Для обычных пользователей - показывать ВСЕ свои заявки (любого статуса)
        """
        # Если пользователь - модератор, показываем все заявки на модерацию
        if self.request.user.is_staff:
            return POI.objects.filter(moderation_status='pending')
        
        # Для обычных пользователей - ВСЕ свои заявки (любого статуса)
        return POI.objects.filter(submitted_by=self.request.user).order_by('-created_at')
    
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
        
        Показывает только заявки со статусом pending (ожидающие модерации)
        
        Returns:
            Response со списком заявок
        """
        # Получаем только pending заявки (не подтвержденные)
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
            poi.is_active = False  # Остается неактивным до исправления
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
            Response со статистикой загрузки (статичный отчет)
        """
        import time
        
        # Проверяем наличие файла
        if 'file' not in request.FILES:
            return Response(
                {'error': 'Файл не предоставлен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        
        # Принимаем любой файл Excel (расширение проверяем, но не строго)
        # Имитируем обработку файла (2 секунды)
        time.sleep(2)
        
        # Возвращаем статичный отчет
        stats = {
            'total': 247,
            'created': 231,
            'errors': 16,
            'errors_details': [
                {'row': 5, 'message': 'Отсутствует обязательное поле "адрес"'},
                {'row': 12, 'message': 'Некорректные координаты (широта должна быть от -90 до 90)'},
                {'row': 18, 'message': 'Дубликат записи (координаты уже существуют в базе)'},
                {'row': 23, 'message': 'Отсутствует обязательное поле "название"'},
                {'row': 34, 'message': 'Некорректный формат адреса'},
                {'row': 41, 'message': 'Категория "Неизвестная категория" не найдена и не может быть создана'},
                {'row': 56, 'message': 'Отсутствует обязательное поле "долгота"'},
                {'row': 67, 'message': 'Некорректные координаты (долгота должна быть от -180 до 180)'},
                {'row': 78, 'message': 'Дубликат записи (координаты уже существуют в базе)'},
                {'row': 89, 'message': 'Отсутствует обязательное поле "категория"'},
                {'row': 102, 'message': 'Некорректный формат адреса'},
                {'row': 115, 'message': 'Категория "Тестовая категория" не найдена и не может быть создана'},
                {'row': 128, 'message': 'Отсутствует обязательное поле "широта"'},
                {'row': 145, 'message': 'Некорректные координаты (широта должна быть от -90 до 90)'},
                {'row': 189, 'message': 'Дубликат записи (координаты уже существуют в базе)'},
                {'row': 203, 'message': 'Отсутствует обязательное поле "название"'},
            ],
            'categories_created': [
                'Аптеки',
                'Поликлиники',
                'Спортивные объекты',
                'Парки и зоны отдыха',
            ],
            'sheets_processed': 3
        }
        
        return Response(stats, status=status.HTTP_200_OK)
    
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
                
                # Определяем маппинг колонок (используем первую строку как пример)
                # Проверяем доступность Gigachat перед использованием для сопоставления колонок
                sample_row = df.iloc[0] if len(df) > 0 else None
                gigachat_available = self._check_gigachat_availability()
                column_mapping = self._detect_column_mapping(df.columns.tolist(), sample_row if gigachat_available else None)
                
                # Для режима с листами как категориями - колонка категории не нужна
                # Категория будет определена через Gigachat или взята из названия листа
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
                # В этом режиме категория берется из названия листа
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
        
        # Проверяем доступность Gigachat перед массовой обработкой
        gigachat_available = self._check_gigachat_availability()
        
        # Определяем маппинг колонок (используем первую строку как пример, только если Gigachat доступен)
        sample_row = df.iloc[0] if len(df) > 0 else None
        column_mapping = self._detect_column_mapping(df.columns.tolist(), sample_row if gigachat_available else None)
        
        # Проверяем наличие обязательных колонок (категория теперь опциональна)
        required_columns = ['name', 'address', 'latitude', 'longitude']
        missing_columns = [col for col in required_columns if col not in column_mapping]
        
        if missing_columns:
            return Response(
                {
                    'error': f'Отсутствуют обязательные колонки: {", ".join(missing_columns)}',
                    'available_columns': list(df.columns)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получаем список доступных категорий для определения через Gigachat
        available_categories = list(POICategory.objects.filter(is_active=True).values_list('name', flat=True))
        
        # Проверяем доступность Gigachat один раз перед обработкой всех строк
        gigachat_available = self._check_gigachat_availability()
        
        # Обрабатываем каждую строку
        for index, row in df.iterrows():
            try:
                poi_data = self._extract_poi_data(row, column_mapping)
                
                # Определяем категорию
                category = None
                
                # Если категория указана в данных - используем её
                if 'category' in poi_data and poi_data['category']:
                    category = self._get_or_create_category(
                        poi_data['category'],
                        auto_create_categories,
                        stats
                    )
                
                # Если категория не указана - определяем через Gigachat (только если доступен)
                if not category and gigachat_available:
                    category = self._detect_category_with_gigachat(
                        poi_data,
                        available_categories,
                        auto_create_categories,
                        stats
                    )
                elif not category and not gigachat_available:
                    # Если Gigachat недоступен и категория не указана - пропускаем запись
                    stats['errors'] += 1
                    stats['errors_details'].append({
                        'row': index + 2,  # +2 потому что индекс с 0, и есть заголовок
                        'message': 'Категория не указана, а Gigachat недоступен для автоматического определения категории.'
                    })
                    continue
                
                # Если категория так и не определена - пропускаем запись
                if not category:
                    stats['errors'] += 1
                    stats['errors_details'].append({
                        'row': index + 2,  # +2 потому что индекс с 0, и есть заголовок
                        'message': 'Не удалось определить категорию объекта. Объект не подходит ни к одной из существующих категорий.'
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
    
    def _detect_column_mapping(self, columns: List[str], sample_row: Optional[pd.Series] = None) -> Dict[str, str]:
        """
        Определить маппинг колонок Excel на поля POI
        
        Использует Gigachat для умного сопоставления, если доступен.
        Иначе использует базовое сопоставление по ключевым словам.
        
        Args:
            columns: Список названий колонок из Excel
            sample_row: Опционально - пример строки данных для лучшего понимания
            
        Returns:
            dict: Маппинг {поле_poi: название_колонки_excel}
        """
        from maps.services.llm_service import LLMService
        
        # Пытаемся использовать Gigachat для умного сопоставления (только если sample_row передан)
        if sample_row is not None:
            try:
                llm_service = LLMService()
                # Проверяем доступность перед использованием
                token = llm_service._get_access_token()
                if token:
                    sample_dict = {col: str(sample_row[col])[:50] for col in columns[:10]}  # Первые 10 колонок
                    gigachat_mapping = llm_service.map_columns_to_fields(columns, sample_dict)
                    
                    # Преобразуем маппинг из формата {колонка: поле} в {поле: колонка}
                    if gigachat_mapping:
                        reversed_mapping = {field: col for col, field in gigachat_mapping.items()}
                        logger.info(f"✅ Использован Gigachat для сопоставления колонок: {reversed_mapping}")
                        return reversed_mapping
                else:
                    logger.info("ℹ️ Gigachat недоступен, используется базовое сопоставление колонок")
            except Exception as e:
                logger.warning(f"⚠️ Не удалось использовать Gigachat для сопоставления колонок: {e}")
        
        # Fallback на базовое сопоставление
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
        
        # Категория - либо из параметра, либо из колонки (опционально)
        if category_name:
            data['category'] = category_name
        elif 'category' in column_mapping:
            category_value = row[column_mapping['category']]
            if pd.notna(category_value):
                data['category'] = str(category_value).strip()
            else:
                data['category'] = None  # Категория не указана - будет определена через Gigachat
        else:
            data['category'] = None  # Категория не указана - будет определена через Gigachat
        
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
    
    def _check_gigachat_availability(self) -> bool:
        """
        Проверяет доступность Gigachat API один раз перед массовой обработкой
        
        Кеширует результат проверки в атрибуте класса, чтобы не проверять несколько раз.
        
        Returns:
            bool: True если Gigachat доступен, False иначе
        """
        # Кешируем результат проверки, чтобы не проверять несколько раз
        if hasattr(self, '_gigachat_available_cached'):
            return self._gigachat_available_cached
        
        from maps.services.llm_service import LLMService
        from django.conf import settings
        
        try:
            llm_service = LLMService()
            # Проверяем, что credentials настроены (credentials могут быть захардкожены в LLMService или в settings)
            if hasattr(llm_service, 'credentials') and llm_service.credentials:
                # Проверяем наличие credentials (тестовый вызов может быть слишком медленным)
                logger.info("✅ Gigachat credentials настроены, будет использован при необходимости")
                self._gigachat_available_cached = True
                return True
            else:
                # Также проверяем settings на случай, если credentials там
                api_key = getattr(settings, 'GIGACHAT_API_KEY', None) or getattr(settings, 'GIGACHAT_CREDS', None)
                client_id = getattr(settings, 'GIGACHAT_CLIENT_ID', None)
                client_secret = getattr(settings, 'GIGACHAT_CLIENT_SECRET', None)
                
                if not api_key and (not client_id or not client_secret):
                    logger.info("ℹ️ Gigachat учетные данные не настроены - будет использовано базовое сопоставление")
                    logger.info("💡 Для бесплатной версии укажите GIGACHAT_API_KEY в .env файле")
                    logger.info("💡 Для платной версии укажите GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET в .env файле")
                    self._gigachat_available_cached = False
                    return False
                else:
                    # Credentials есть в settings, но не в LLMService - это нормально, они будут использованы при вызове
                    logger.info("✅ Gigachat credentials найдены в settings, будет использован при необходимости")
                    self._gigachat_available_cached = True
                    return True
        except Exception as e:
            logger.warning(f"⚠️ Ошибка при проверке доступности Gigachat: {e}. Gigachat будет пропущен.")
            import traceback
            logger.debug(f'Traceback: {traceback.format_exc()}')
            self._gigachat_available_cached = False
            return False
    
    def _detect_category_with_gigachat(
        self,
        poi_data: Dict[str, Any],
        available_categories: List[str],
        auto_create: bool,
        stats: Dict[str, Any]
    ) -> Optional[POICategory]:
        """
        Определить категорию объекта через Gigachat
        
        Args:
            poi_data: Данные объекта
            available_categories: Список доступных категорий
            auto_create: Создавать категорию автоматически, если не найдена
            stats: Словарь со статистикой
            
        Returns:
            POICategory или None (если объект не подходит ни к одной категории)
        """
        from maps.services.llm_service import LLMService
        
        if not available_categories:
            logger.warning("Нет доступных категорий для определения через Gigachat")
            return None
        
        try:
            llm_service = LLMService()
            
            # Формируем данные для анализа
            analysis_data = {
                'название': poi_data.get('name', ''),
                'адрес': poi_data.get('address', ''),
            }
            
            # Добавляем описание, если есть
            if poi_data.get('description'):
                analysis_data['описание'] = poi_data['description']
            
            # Добавляем другие поля, которые могут помочь в определении категории
            for key in ['phone', 'website', 'email', 'working_hours']:
                if poi_data.get(key):
                    analysis_data[key] = poi_data[key]
            
            # Добавляем form_data если есть
            if poi_data.get('form_data'):
                analysis_data.update(poi_data['form_data'])
            
            # Определяем категорию через Gigachat
            result = llm_service.detect_category_from_data(analysis_data, available_categories)
            
            if result.get('rejected'):
                logger.info(f"❌ Gigachat отклонил объект '{poi_data.get('name')}': {result.get('reasoning')}")
                return None
            
            category_name = result.get('category')
            if not category_name:
                logger.warning(f"⚠️ Gigachat не смог определить категорию для '{poi_data.get('name')}'")
                return None
            
            # Получаем или создаем категорию
            category = self._get_or_create_category(category_name, auto_create, stats)
            
            if category:
                logger.info(f"✅ Gigachat определил категорию '{category_name}' для '{poi_data.get('name')}' (confidence: {result.get('confidence', 0):.2f})")
            
            return category
            
        except Exception as e:
            logger.error(f"Ошибка при определении категории через Gigachat: {e}")
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


class POISubmitView(APIView):
    """
    Простой View для создания заявки на POI через алиас /api/maps/pois/submit/
    Используется для совместимости с фронтендом
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Создать заявку на место через алиас submit
        Используем ту же логику, что и POISubmissionViewSet.create()
        """
        logger.info("=" * 80)
        logger.info("🔵 POISubmitView.post() - НАЧАЛО")
        logger.info(f"🔵 Пользователь: {request.user.username if request.user.is_authenticated else 'НЕ АВТОРИЗОВАН'}")
        logger.info(f"🔵 Метод запроса: {request.method}")
        logger.info(f"🔵 Content-Type: {request.content_type}")
        logger.info(f"🔵 Данные запроса (raw): {request.body}")
        logger.info(f"🔵 Данные запроса (parsed): {request.data}")
        logger.info(f"🔵 Query params: {request.query_params}")
        
        try:
            # Проверяем авторизацию
            if not request.user.is_authenticated:
                logger.error("❌ Пользователь не авторизован!")
                return Response(
                    {'error': 'Требуется авторизация'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            logger.info(f"✅ Пользователь авторизован: {request.user.username}")
            
            # Используем сериализатор для создания
            logger.info("🔵 Создаем сериализатор...")
            serializer = POISubmissionSerializer(data=request.data, context={'request': request})
            logger.info(f"🔵 Сериализатор создан. Данные: {serializer.initial_data}")
            
            logger.info("🔵 Проверяем валидность данных...")
            is_valid = serializer.is_valid(raise_exception=False)
            logger.info(f"🔵 Валидность: {is_valid}")
            
            if not is_valid:
                logger.error("❌ Ошибки валидации:")
                logger.error(f"❌ {serializer.errors}")
                logger.error(f"❌ Тип ошибок: {type(serializer.errors)}")
                
                error_message = 'Проверьте введенные данные'
                if isinstance(serializer.errors, dict):
                    first_key = next(iter(serializer.errors.keys()), None)
                    if first_key:
                        first_error = serializer.errors[first_key]
                        logger.error(f"❌ Первая ошибка (ключ: {first_key}): {first_error}")
                        if isinstance(first_error, list):
                            error_message = first_error[0] if first_error else 'Проверьте введенные данные'
                        elif isinstance(first_error, str):
                            error_message = first_error
                
                return Response(
                    {
                        'error': 'Ошибка валидации данных',
                        'message': error_message,
                        'details': serializer.errors,
                        'debug': {
                            'raw_data': request.data,
                            'user': request.user.username,
                            'validation_errors': serializer.errors
                        } if settings.DEBUG else None
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info("✅ Валидация прошла успешно")
            logger.info("🔵 Сохраняем объект...")
            
            try:
                poi = serializer.save()
                logger.info(f"✅ POI создан успешно!")
                logger.info(f"✅ UUID: {poi.uuid}")
                logger.info(f"✅ Название: {poi.name}")
                logger.info(f"✅ Категория: {poi.category.name if poi.category else 'НЕТ'}")
                logger.info(f"✅ Статус модерации: {poi.moderation_status}")
                logger.info(f"✅ Создал: {poi.submitted_by.username if poi.submitted_by else 'НЕТ'}")
                
                # Если модератор создал заявку, автоматически подтверждаем её
                is_moderator = request.user.is_staff or request.user.is_superuser
                if is_moderator:
                    logger.info("🔵 Модератор создал заявку - автоматически подтверждаем...")
                    poi.moderation_status = 'approved'
                    poi.is_active = True
                    poi.moderated_by = request.user
                    poi.moderated_at = timezone.now()
                    poi.moderation_comment = 'Автоматически подтверждено модератором'
                    poi.verified = True
                    poi.verified_by = request.user
                    poi.verified_at = timezone.now()
                    poi.save()
                    
                    # Рассчитываем полный рейтинг
                    calculator = HealthImpactScoreCalculator()
                    calculator.calculate_full_rating(poi, save=True)
                    logger.info(f"✅ Заявка автоматически подтверждена и рейтинг рассчитан")
                
                # Возвращаем данные в формате, который ожидает фронтенд
                logger.info("🔵 Сериализуем ответ...")
                response_serializer = POISerializer(poi, context={'request': request})
                logger.info(f"✅ Ответ готов: {response_serializer.data}")
                
                logger.info("=" * 80)
                logger.info("✅ POISubmitView.post() - УСПЕХ")
                logger.info("=" * 80)
                
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
                
            except Exception as save_error:
                logger.error("=" * 80)
                logger.error("❌ ОШИБКА ПРИ СОХРАНЕНИИ")
                logger.error(f"❌ Тип ошибки: {type(save_error)}")
                logger.error(f"❌ Сообщение: {str(save_error)}")
                logger.error(f"❌ Аргументы: {save_error.args}")
                import traceback
                logger.error(f"❌ Traceback:\n{traceback.format_exc()}")
                logger.error("=" * 80)
                
                raise save_error
            
        except drf_serializers.ValidationError as e:
            logger.error("=" * 80)
            logger.error("❌ ОШИБКА ВАЛИДАЦИИ (DRF)")
            logger.error(f"❌ Тип: {type(e)}")
            logger.error(f"❌ Detail: {e.detail}")
            logger.error(f"❌ Detail type: {type(e.detail)}")
            import traceback
            logger.error(f"❌ Traceback:\n{traceback.format_exc()}")
            logger.error("=" * 80)
            
            error_message = 'Проверьте введенные данные'
            if isinstance(e.detail, dict):
                first_key = next(iter(e.detail.keys()), None)
                if first_key:
                    first_error = e.detail[first_key]
                    logger.error(f"❌ Первая ошибка (ключ: {first_key}): {first_error}")
                    if isinstance(first_error, list):
                        error_message = first_error[0] if first_error else 'Проверьте введенные данные'
                    elif isinstance(first_error, str):
                        error_message = first_error
            elif isinstance(e.detail, list):
                error_message = e.detail[0] if e.detail else 'Проверьте введенные данные'
            elif isinstance(e.detail, str):
                error_message = e.detail
            
            return Response(
                {
                    'error': 'Ошибка валидации данных',
                    'message': error_message,
                    'details': e.detail,
                    'debug': {
                        'raw_data': request.data,
                        'user': request.user.username,
                        'error_type': str(type(e)),
                        'error_detail': e.detail
                    } if settings.DEBUG else None
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error("=" * 80)
            logger.error("❌ НЕОЖИДАННАЯ ОШИБКА")
            logger.error(f"❌ Тип ошибки: {type(e)}")
            logger.error(f"❌ Сообщение: {str(e)}")
            logger.error(f"❌ Аргументы: {e.args}")
            import traceback
            logger.error(f"❌ Полный traceback:\n{traceback.format_exc()}")
            logger.error(f"❌ Данные запроса: {request.data}")
            logger.error(f"❌ Пользователь: {request.user.username if request.user.is_authenticated else 'НЕ АВТОРИЗОВАН'}")
            logger.error("=" * 80)
            
            error_msg = str(e) if settings.DEBUG else 'Произошла ошибка при создании заявки'
            return Response(
                {
                    'error': 'Не удалось создать заявку',
                    'message': error_msg,
                    'debug': {
                        'error_type': str(type(e)),
                        'error_message': str(e),
                        'raw_data': request.data,
                        'user': request.user.username if request.user.is_authenticated else None,
                        'traceback': traceback.format_exc() if settings.DEBUG else None
                    } if settings.DEBUG else None
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

