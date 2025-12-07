"""
Serializers для REST API модуля карт

Используются для сериализации/десериализации данных:
- POI (точки интереса)
- Категории POI
- Результаты анализа областей
"""

from rest_framework import serializers
from maps.models import POI, POICategory, POIRating, AreaAnalysis, FormSchema
from maps.services.form_validator import FormValidator
from maps.services.infrastructure_score_calculator import InfrastructureScoreCalculator


class POICategorySerializer(serializers.ModelSerializer):
    """
    Serializer для категорий POI
    
    Используется для:
    - Получения списка категорий для фильтров
    - Отображения категории в POI
    """
    
    class Meta:
        model = POICategory
        fields = [
            'uuid', 'name', 'description', 'icon',
            'marker_color', 'display_order', 'is_active',
        ]
        read_only_fields = ['uuid']


class POIRatingSerializer(serializers.ModelSerializer):
    """
    Serializer для рейтинга POI
    
    Используется для отображения рейтинга объекта
    """
    
    class Meta:
        model = POIRating
        fields = [
            'uuid', 'health_score', 'S_infra', 'S_social', 'S_HIS',
            'reviews_count', 'approved_reviews_count', 'average_user_rating',
            'last_calculated_at', 'last_infra_calculation', 'last_social_calculation',
            'calculation_metadata',
        ]
        read_only_fields = ['uuid', 'last_calculated_at', 'last_infra_calculation', 'last_social_calculation']


class POISerializer(serializers.ModelSerializer):
    """
    Serializer для точки интереса (POI)
    
    Используется для:
    - Отображения объектов на карте
    - Детальной информации об объекте
    - Создания/обновления POI (для админов)
    - Представления заявок на создание мест
    """
    category = POICategorySerializer(read_only=True)
    category_uuid = serializers.SerializerMethodField()
    category_uuid_write = serializers.UUIDField(
        source='category',
        write_only=True,
        required=False,
        allow_null=True
    )
    rating = POIRatingSerializer(read_only=True)
    
    # Поля для заявок на создание мест
    submitted_by = serializers.SerializerMethodField()
    moderated_by = serializers.SerializerMethodField()
    llm_verdict = serializers.SerializerMethodField()
    
    class Meta:
        model = POI
        fields = [
            'uuid', 'name', 'category', 'category_uuid', 'category_uuid_write',
            'address', 'latitude', 'longitude',
            'description', 'phone', 'website', 'email',
            'working_hours', 'rating', 'is_active',
            'form_data', 'verified', 'verified_by', 'verified_at',
            'moderation_status', 'submitted_by',
            'moderated_by', 'moderated_at', 'moderation_comment',
            'llm_verdict', 'llm_rating', 'llm_report', 'llm_analyzed_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'uuid', 'created_at', 'updated_at', 'is_geocoded', 'geocoded_at',
            'moderation_status', 'submitted_by', 'moderated_by', 'moderated_at',
            'moderation_comment', 'llm_verdict'
        ]
    
    def get_category_uuid(self, obj):
        """Получить UUID категории"""
        return str(obj.category.uuid) if obj.category else None
    
    def get_submitted_by(self, obj):
        """Получить информацию о пользователе, создавшем заявку"""
        if not obj.submitted_by:
            return None
        return {
            'id': obj.submitted_by.id,
            'username': obj.submitted_by.username,
            'email': obj.submitted_by.email,
        }
    
    def get_moderated_by(self, obj):
        """Получить информацию о модераторе, если заявка была промодерирована"""
        if not obj.moderated_by:
            return None
        return {
            'id': obj.moderated_by.id,
            'username': obj.moderated_by.username,
        }
    
    def get_llm_verdict(self, obj):
        """Получить вердикт LLM, если есть"""
        if obj.llm_verdict:
            return obj.llm_verdict
        return None
    
    def to_internal_value(self, data):
        """Обработка category_uuid при создании/обновлении"""
        # Обрабатываем category_uuid для записи
        category_uuid = data.get('category_uuid')
        if category_uuid:
            from maps.models import POICategory
            try:
                category = POICategory.objects.get(uuid=category_uuid, is_active=True)
                data['category_uuid_write'] = category.uuid
                data['category'] = category.pk
            except POICategory.DoesNotExist:
                pass
        return super().to_internal_value(data)


class POIListSerializer(serializers.ModelSerializer):
    """
    Упрощенный Serializer для списка POI на карте
    
    Используется для массового отображения объектов
    (меньше данных = быстрее загрузка)
    """
    category_name = serializers.SerializerMethodField()
    category_uuid = serializers.SerializerMethodField()
    marker_color = serializers.SerializerMethodField()
    health_score = serializers.SerializerMethodField()
    
    class Meta:
        model = POI
        fields = [
            'uuid', 'name', 'category_name', 'category_uuid',
            'address', 'latitude', 'longitude',
            'marker_color', 'health_score',
        ]
    
    def get_category_name(self, obj):
        """Получить название категории с обработкой отсутствия"""
        return obj.category.name if obj.category else 'Без категории'
    
    def get_category_uuid(self, obj):
        """Получить UUID категории с обработкой отсутствия"""
        return str(obj.category.uuid) if obj.category else ''
    
    def get_marker_color(self, obj):
        """Получить цвет маркера с обработкой отсутствия"""
        if obj.category and obj.category.marker_color:
            return obj.category.marker_color
        return '#00FF00'  # Зеленый по умолчанию
    
    def get_health_score(self, obj):
        """Получить индекс здоровья с обработкой отсутствия"""
        if obj.rating and obj.rating.health_score is not None:
            return float(obj.rating.health_score)
        return 0.0  # По умолчанию 0


class AreaAnalysisRequestSerializer(serializers.Serializer):
    """
    Serializer для запроса анализа области
    
    Поддерживает три режима:
    1. Радиус: center_lat, center_lon, radius_meters
    2. Bounding box: sw_lat, sw_lon, ne_lat, ne_lon, analysis_type
    """
    # Параметры для режима радиуса
    center_lat = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        help_text='Широта центра (для режима радиуса)'
    )
    center_lon = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        help_text='Долгота центра (для режима радиуса)'
    )
    radius_meters = serializers.IntegerField(
        min_value=1,
        required=False,
        help_text='Радиус в метрах (для режима радиуса)'
    )
    
    # Параметры для режима bounding box
    sw_lat = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        help_text='Широта юго-западного угла (для режима bbox)'
    )
    sw_lon = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        help_text='Долгота юго-западного угла (для режима bbox)'
    )
    ne_lat = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        help_text='Широта северо-восточного угла (для режима bbox)'
    )
    ne_lon = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        help_text='Долгота северо-восточного угла (для режима bbox)'
    )
    
    # Тип анализа
    analysis_type = serializers.ChoiceField(
        choices=['radius', 'city', 'street'],
        default='city',
        help_text='Тип анализа: radius, city или street'
    )
    
    # Фильтры по категориям
    category_filters = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        help_text='Список slug категорий для фильтрации'
    )
    
    def validate(self, attrs):
        """
        Валидация параметров запроса
        
        Проверяет наличие необходимых параметров для выбранного режима
        """
        analysis_type = attrs.get('analysis_type', 'city')
        
        if analysis_type == 'radius':
            if not all([attrs.get('center_lat'), attrs.get('center_lon'), attrs.get('radius_meters')]):
                raise serializers.ValidationError(
                    'Для режима радиуса необходимы: center_lat, center_lon, radius_meters'
                )
        else:  # city или street
            if not all([attrs.get('sw_lat'), attrs.get('sw_lon'), attrs.get('ne_lat'), attrs.get('ne_lon')]):
                raise serializers.ValidationError(
                    'Для режима bounding box необходимы: sw_lat, sw_lon, ne_lat, ne_lon'
                )
        
        return attrs


class AreaAnalysisResponseSerializer(serializers.Serializer):
    """
    Serializer для ответа анализа области
    
    Используется для форматирования результатов анализа
    """
    health_index = serializers.FloatField(
        min_value=0.0,
        max_value=100.0,
        help_text='Индекс здоровья области (0-100)'
    )
    health_interpretation = serializers.CharField(
        help_text='Текстовое описание индекса'
    )
    analysis_type = serializers.ChoiceField(
        choices=['radius', 'city', 'street'],
        help_text='Тип выполненного анализа'
    )
    area_name = serializers.CharField(
        allow_blank=True,
        help_text='Название области (если определено)'
    )
    category_stats = serializers.DictField(
        help_text='Статистика по категориям объектов'
    )
    objects = serializers.ListField(
        help_text='Список объектов, использованных в анализе'
    )
    total_count = serializers.IntegerField(
        min_value=0,
        help_text='Общее количество объектов в анализе'
    )
    area_params = serializers.DictField(
        help_text='Параметры анализируемой области'
    )


class POISubmissionSerializer(serializers.Serializer):
    """
    Serializer для создания заявки на место
    
    Используется для ручного создания места пользователем.
    Поддерживает заполнение динамических полей формы на основе категории.
    """
    name = serializers.CharField(max_length=500, required=True)
    address = serializers.CharField(max_length=500, required=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=True)
    category_uuid = serializers.UUIDField(required=True)
    description = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    form_data = serializers.JSONField(required=False, default=dict)
    
    def validate_category_uuid(self, value):
        """
        Проверить существование категории
        
        Args:
            value: UUID категории
            
        Returns:
            UUID: UUID категории
            
        Raises:
            serializers.ValidationError: Если категория не найдена
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"🟡 validate_category_uuid() - значение: {value} (тип: {type(value)})")
        
        try:
            logger.info(f"🟡 Ищем категорию в БД...")
            category = POICategory.objects.get(uuid=value, is_active=True)
            logger.info(f"✅ Категория найдена: {category.name} (UUID: {category.uuid})")
            return value
        except POICategory.DoesNotExist:
            logger.error(f"❌ Категория не найдена: {value}")
            logger.error(f"❌ Доступные категории:")
            for cat in POICategory.objects.filter(is_active=True):
                logger.error(f"   - {cat.name}: {cat.uuid}")
            raise serializers.ValidationError(f'Категория с UUID "{value}" не найдена или неактивна')
        return value
    
    def validate_description(self, value):
        """
        Валидировать описание
        
        Args:
            value: Описание места
            
        Returns:
            str: Описание места или пустая строка
        """
        if value:
            value = value.strip()
            if len(value) > 2000:
                raise serializers.ValidationError('Описание не должно превышать 2000 символов')
        return value or ''
    
    def validate_form_data(self, value):
        """
        Валидировать данные формы
        
        Args:
            value: Данные формы (dict)
            
        Returns:
            dict: Валидированные данные формы
        """
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError('form_data должен быть объектом (dict)')
        return value
    
    def validate(self, attrs):
        """
        Дополнительная валидация на уровне всех полей
        
        Args:
            attrs: Все валидированные данные
            
        Returns:
            dict: Валидированные данные
        """
        # Если описание не указано, но есть form_data, это нормально
        # Если нет ни того, ни другого - это тоже нормально (модератор добавит)
        return attrs
    
    def create(self, validated_data):
        """
        Создать POI со статусом pending
        
        Args:
            validated_data: Валидированные данные
            
        Returns:
            POI: Созданный объект
        """
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info("=" * 80)
        logger.info("🟢 POISubmissionSerializer.create() - НАЧАЛО")
        logger.info(f"🟢 Валидированные данные: {validated_data}")
        logger.info(f"🟢 Тип данных: {type(validated_data)}")
        logger.info(f"🟢 Ключи: {list(validated_data.keys())}")
        
        try:
            # Получаем категорию
            logger.info("🟢 Получаем category_uuid...")
            category_uuid = validated_data.pop('category_uuid')
            logger.info(f"🟢 category_uuid: {category_uuid} (тип: {type(category_uuid)})")
            
            try:
                logger.info(f"🟢 Ищем категорию в БД...")
                category = POICategory.objects.get(uuid=category_uuid, is_active=True)
                logger.info(f"✅ Категория найдена: {category.name} (UUID: {category.uuid})")
            except POICategory.DoesNotExist:
                logger.error(f"❌ Категория не найдена: {category_uuid}")
                logger.error(f"❌ Доступные категории:")
                for cat in POICategory.objects.filter(is_active=True):
                    logger.error(f"   - {cat.name}: {cat.uuid}")
                raise serializers.ValidationError(f'Категория с UUID "{category_uuid}" не найдена или неактивна')
            except Exception as cat_error:
                logger.error(f"❌ Ошибка при поиске категории: {type(cat_error)} - {str(cat_error)}")
                import traceback
                logger.error(f"❌ Traceback:\n{traceback.format_exc()}")
                raise
            
            # Получаем пользователя из контекста
            logger.info("🟢 Проверяем контекст request...")
            logger.info(f"🟢 Контекст: {self.context}")
            logger.info(f"🟢 Ключи контекста: {list(self.context.keys())}")
            
            if 'request' not in self.context:
                logger.error('❌ Контекст request не передан в сериализатор')
                logger.error(f"❌ Доступные ключи контекста: {list(self.context.keys())}")
                raise serializers.ValidationError('Ошибка конфигурации: требуется авторизация')
            
            logger.info("🟢 Получаем пользователя из контекста...")
            user = self.context['request'].user
            logger.info(f"🟢 Пользователь: {user}")
            logger.info(f"🟢 Авторизован: {user.is_authenticated if user else False}")
            logger.info(f"🟢 ID пользователя: {user.id if user else None}")
            logger.info(f"🟢 Username: {user.username if user else None}")
            
            if not user or not user.is_authenticated:
                logger.error('❌ Пользователь не авторизован')
                raise serializers.ValidationError('Требуется авторизация')
            
            logger.info(f"✅ Пользователь авторизован: {user.username} (ID: {user.id})")
            
            # Извлекаем описание и form_data
            logger.info("🟢 Извлекаем описание и form_data...")
            description = validated_data.pop('description', '') or ''
            form_data = validated_data.pop('form_data', {}) or {}
            logger.info(f"🟢 Описание: '{description}' (длина: {len(description)})")
            logger.info(f"🟢 Form data: {form_data} (тип: {type(form_data)})")
            
            # Получаем схему формы категории, если есть
            logger.info("🟢 Получаем схему формы категории...")
            form_schema = None
            try:
                form_schema = category.form_schema
                logger.info(f"✅ Схема формы найдена: {form_schema.uuid}")
            except FormSchema.DoesNotExist:
                logger.info("ℹ️ Схема формы не найдена (это нормально)")
                pass
            except Exception as schema_error:
                logger.warning(f"⚠️ Ошибка при получении схемы: {type(schema_error)} - {str(schema_error)}")
            
            # Модераторские заявки создаются как pending, чтобы попасть в модерацию
            # Затем они будут автоматически подтверждены через API модерации
            is_moderator = user.is_staff or user.is_superuser
            moderation_status = 'pending'  # Все заявки создаются как pending
            is_active = False  # Неактивны до модерации
            
            # Создаем POI
            logger.info("🟢 Создаем POI объект...")
            logger.info(f"🟢 Оставшиеся validated_data: {validated_data}")
            logger.info(f"🟢 Параметры для создания:")
            logger.info(f"   - category: {category.name} ({category.uuid})")
            logger.info(f"   - description: '{description}'")
            logger.info(f"   - form_data: {form_data}")
            logger.info(f"   - form_schema: {form_schema}")
            logger.info(f"   - submitted_by: {user.username} ({user.id})")
            logger.info(f"   - is_moderator: {is_moderator}")
            logger.info(f"   - moderation_status: {moderation_status}")
            logger.info(f"   - is_active: {is_active}")
            logger.info(f"   - validated_data: {validated_data}")
            
            try:
                poi = POI.objects.create(
                    category=category,
                    description=description,
                    form_data=form_data,
                    form_schema=form_schema,
                    submitted_by=user,
                    moderation_status=moderation_status,
                    is_active=is_active,
                    **validated_data
                )
                
                # Модераторские заявки создаются как pending, чтобы попасть в модерацию
                # Автоматическое подтверждение будет выполнено через API модерации
                logger.info(f"✅ POI создан со статусом: {poi.moderation_status}")
                if is_moderator:
                    logger.info(f"ℹ️ Заявка модератора создана, будет автоматически подтверждена")
                logger.info(f"✅ POI создан успешно!")
                logger.info(f"✅ UUID: {poi.uuid}")
                logger.info(f"✅ Название: {poi.name}")
                logger.info(f"✅ Адрес: {poi.address}")
                logger.info(f"✅ Координаты: {poi.latitude}, {poi.longitude}")
                logger.info(f"✅ Категория: {poi.category.name}")
                logger.info(f"✅ Статус: {poi.moderation_status}")
                logger.info(f"✅ Активен: {poi.is_active}")
                logger.info(f"✅ Создал: {poi.submitted_by.username}")
                logger.info("=" * 80)
                logger.info("✅ POISubmissionSerializer.create() - УСПЕХ")
                logger.info("=" * 80)
                
                return poi
            except Exception as create_error:
                logger.error("=" * 80)
                logger.error("❌ ОШИБКА ПРИ СОЗДАНИИ POI")
                logger.error(f"❌ Тип ошибки: {type(create_error)}")
                logger.error(f"❌ Сообщение: {str(create_error)}")
                logger.error(f"❌ Аргументы: {create_error.args}")
                import traceback
                logger.error(f"❌ Traceback:\n{traceback.format_exc()}")
                logger.error(f"❌ Данные для создания:")
                logger.error(f"   - category: {category}")
                logger.error(f"   - description: {description}")
                logger.error(f"   - form_data: {form_data}")
                logger.error(f"   - form_schema: {form_schema}")
                logger.error(f"   - submitted_by: {user}")
                logger.error(f"   - validated_data: {validated_data}")
                logger.error("=" * 80)
                raise
            
        except serializers.ValidationError as ve:
            logger.error("=" * 80)
            logger.error("❌ ОШИБКА ВАЛИДАЦИИ (Serializer)")
            logger.error(f"❌ Detail: {ve.detail}")
            logger.error("=" * 80)
            raise
        except Exception as e:
            logger.error("=" * 80)
            logger.error("❌ НЕОЖИДАННАЯ ОШИБКА В create()")
            logger.error(f"❌ Тип ошибки: {type(e)}")
            logger.error(f"❌ Сообщение: {str(e)}")
            logger.error(f"❌ Аргументы: {e.args}")
            import traceback
            logger.error(f"❌ Traceback:\n{traceback.format_exc()}")
            logger.error("=" * 80)
            raise serializers.ValidationError(f'Ошибка при создании заявки: {str(e)}')

