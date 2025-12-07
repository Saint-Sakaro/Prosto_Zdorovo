"""
Serializers для REST API модуля карт

Используются для сериализации/десериализации данных:
- POI (точки интереса)
- Категории POI
- Результаты анализа областей
"""

from rest_framework import serializers
from maps.models import POI, POICategory, POIRating, AreaAnalysis


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

