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
            'uuid', 'name', 'slug', 'description', 'icon',
            'marker_color', 'health_weight', 'health_importance',
            'display_order', 'is_active',
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
    """
    category = POICategorySerializer(read_only=True)
    category_slug = serializers.SlugRelatedField(
        source='category',
        queryset=POICategory.objects.filter(is_active=True),
        slug_field='slug',
        write_only=True,
        required=True
    )
    rating = POIRatingSerializer(read_only=True)
    
    class Meta:
        model = POI
        fields = [
            'uuid', 'name', 'category', 'category_slug',
            'address', 'latitude', 'longitude',
            'description', 'phone', 'website', 'email',
            'working_hours', 'rating', 'is_active',
            'form_data', 'verified', 'verified_by', 'verified_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['uuid', 'created_at', 'updated_at', 'is_geocoded', 'geocoded_at']


class POIListSerializer(serializers.ModelSerializer):
    """
    Упрощенный Serializer для списка POI на карте
    
    Используется для массового отображения объектов
    (меньше данных = быстрее загрузка)
    """
    category_name = serializers.SerializerMethodField()
    category_slug = serializers.SerializerMethodField()
    marker_color = serializers.SerializerMethodField()
    health_score = serializers.SerializerMethodField()
    
    class Meta:
        model = POI
        fields = [
            'uuid', 'name', 'category_name', 'category_slug',
            'address', 'latitude', 'longitude',
            'marker_color', 'health_score',
        ]
    
    def get_category_name(self, obj):
        """Получить название категории с обработкой отсутствия"""
        return obj.category.name if obj.category else 'Без категории'
    
    def get_category_slug(self, obj):
        """Получить slug категории с обработкой отсутствия"""
        return obj.category.slug if obj.category else ''
    
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
    
    Используется для ручного создания места пользователем
    """
    name = serializers.CharField(max_length=500, required=True)
    address = serializers.CharField(max_length=500, required=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=True)
    category_slug = serializers.SlugField(required=True)
    form_data = serializers.JSONField(required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    
    def validate_category_slug(self, value):
        """
        Проверить существование категории
        
        Args:
            value: Slug категории
            
        Returns:
            str: Slug категории
            
        Raises:
            serializers.ValidationError: Если категория не найдена
        """
        try:
            category = POICategory.objects.get(slug=value, is_active=True)
        except POICategory.DoesNotExist:
            raise serializers.ValidationError(f'Категория с slug "{value}" не найдена или неактивна')
        return value
    
    def validate_form_data(self, value):
        """
        Валидировать данные формы на основе схемы категории
        
        Args:
            value: Данные формы (dict)
            
        Returns:
            dict: Валидированные данные формы
            
        Raises:
            serializers.ValidationError: Если данные не валидны
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError('form_data должен быть словарем')
        
        # Получаем категорию из контекста (должна быть уже проверена в validate_category_slug)
        category_slug = self.initial_data.get('category_slug')
        if not category_slug:
            return value  # Пропускаем валидацию, если категория не указана
        
        try:
            category = POICategory.objects.get(slug=category_slug, is_active=True)
        except POICategory.DoesNotExist:
            return value  # Пропускаем валидацию, если категория не найдена
        
        # Получаем схему формы категории
        try:
            form_schema = category.form_schema
        except FormSchema.DoesNotExist:
            # Если схемы нет, принимаем любые данные
            return value
        
        # Валидируем через FormValidator
        validator = FormValidator(form_schema)
        is_valid, errors = validator.validate(value)
        
        if not is_valid:
            raise serializers.ValidationError({
                'form_data': errors
            })
        
        return value
    
    def create(self, validated_data):
        """
        Создать POI со статусом pending
        
        Args:
            validated_data: Валидированные данные
            
        Returns:
            POI: Созданный объект
        """
        # Получаем категорию
        category_slug = validated_data.pop('category_slug')
        category = POICategory.objects.get(slug=category_slug, is_active=True)
        
        # Получаем схему формы (если есть)
        form_schema = None
        try:
            form_schema = category.form_schema
        except FormSchema.DoesNotExist:
            pass
        
        # Получаем пользователя из контекста
        user = self.context['request'].user
        
        # Извлекаем form_data
        form_data = validated_data.pop('form_data', {})
        
        # Создаем POI со статусом pending
        poi = POI.objects.create(
            category=category,
            form_schema=form_schema,
            form_data=form_data,
            submitted_by=user,
            moderation_status='pending',
            is_active=False,  # Неактивен до модерации
            **validated_data
        )
        
        # Рассчитываем начальный S_infra (для предпросмотра)
        if form_schema and form_data:
            infra_calculator = InfrastructureScoreCalculator()
            try:
                # Сохраняем предварительный расчет в метаданные (не создаем POIRating до модерации)
                poi.metadata = poi.metadata or {}
                poi.metadata['preliminary_s_infra'] = infra_calculator.calculate_infra_score(poi)
                poi.save(update_fields=['metadata'])
            except Exception:
                pass  # Игнорируем ошибки расчета на этапе создания
        
        return poi

