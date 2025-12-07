"""
Модели данных для модуля карт и анализа областей

Содержит модели:
- POICategory: Категории объектов инфраструктуры
- POI: Точки интереса (организации, объекты инфраструктуры)
- POIRating: Рейтинг "здоровости" объекта
- AreaAnalysis: История анализов областей (опционально, для кеширования)
"""

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid


class FormSchema(models.Model):
    """
    JSON-схема анкеты для категории объектов
    
    Хранит структуру анкеты с полями, весами и типами.
    Каждая категория может иметь свою схему анкеты.
    """
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    # Связь с категорией POI
    category = models.OneToOneField(
        'POICategory',
        on_delete=models.CASCADE,
        related_name='form_schema',
        verbose_name='Категория'
    )
    
    # Название схемы
    name = models.CharField(
        max_length=200,
        verbose_name='Название схемы'
    )
    
    # JSON-схема анкеты
    # Структура:
    # {
    #   "fields": [
    #     {
    #       "id": "field_id",
    #       "type": "boolean|range|select|photo",
    #       "label": "Название поля",
    #       "direction": 1 или -1,
    #       "weight": float,
    #       "scale_min": float (для range),
    #       "scale_max": float (для range),
    #       "mapping": {value: normalized_value} (для select),
    #       "options": [список значений] (для select)
    #     }
    #   ],
    #   "version": "1.0",
    #   "generated_by_llm": bool,
    #   "llm_prompt": str (если генерировалась через LLM)
    # }
    schema_json = models.JSONField(
        default=dict,
        verbose_name='JSON схема анкеты'
    )
    
    # Версия схемы (для отслеживания изменений)
    version = models.CharField(
        max_length=20,
        default='1.0',
        verbose_name='Версия схемы'
    )
    
    # Флаг генерации через LLM
    generated_by_llm = models.BooleanField(
        default=False,
        verbose_name='Сгенерирована через LLM'
    )
    
    # Промпт для LLM (если использовалась генерация)
    llm_prompt = models.TextField(
        blank=True,
        verbose_name='Промпт для LLM'
    )
    
    # Статус схемы
    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('pending_review', 'Ожидает проверки'),
        ('approved', 'Утверждена'),
        ('archived', 'Архивная'),
    ]
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name='Статус'
    )
    
    # Кто утвердил схему
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_schemas',
        verbose_name='Утвердил'
    )
    
    # Дата утверждения
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата утверждения'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    class Meta:
        verbose_name = 'Схема анкеты'
        verbose_name_plural = 'Схемы анкет'
        ordering = ['category__name', 'version']
    
    def __str__(self):
        return f"{self.category.name} - {self.name} (v{self.version})"
    
    def get_fields(self):
        """
        Получить список полей из JSON схемы
        
        Returns:
            list: Список словарей с полями анкеты
        """
        return self.schema_json.get('fields', [])
    
    def validate_schema(self):
        """
        Валидация JSON схемы
        
        Returns:
            tuple: (is_valid: bool, errors: list)
        """
        errors = []
        
        if 'fields' not in self.schema_json:
            errors.append('Отсутствует поле "fields" в схеме')
            return False, errors
        
        fields = self.schema_json.get('fields', [])
        if not isinstance(fields, list) or len(fields) == 0:
            errors.append('Поле "fields" должно быть непустым списком')
            return False, errors
        
        for i, field in enumerate(fields):
            field_errors = []
            
            if 'id' not in field:
                field_errors.append('Отсутствует обязательное поле "id"')
            
            if 'type' not in field:
                field_errors.append('Отсутствует обязательное поле "type"')
            elif field['type'] not in ['boolean', 'range', 'select', 'photo']:
                field_errors.append(f'Недопустимый тип поля: {field["type"]}')
            
            if 'weight' not in field:
                field_errors.append('Отсутствует обязательное поле "weight"')
            
            if 'direction' not in field:
                field_errors.append('Отсутствует обязательное поле "direction"')
            elif field.get('direction') not in [1, -1]:
                field_errors.append('Поле "direction" должно быть 1 или -1')
            
            # Специфичные проверки для разных типов
            if field.get('type') == 'range':
                if 'scale_min' not in field or 'scale_max' not in field:
                    field_errors.append('Для типа "range" обязательны поля scale_min и scale_max')
            
            if field.get('type') == 'select':
                if 'mapping' not in field and 'options' not in field:
                    field_errors.append('Для типа "select" необходимо поле "mapping" или "options"')
            
            if field_errors:
                errors.append(f'Поле #{i+1}: {"; ".join(field_errors)}')
        
        return len(errors) == 0, errors


class POICategory(models.Model):
    """
    Категория объектов инфраструктуры
    
    Примеры категорий:
    - Аптеки
    - Места с полезной едой
    - Точки продажи алкоголя и табака
    - Спортивные объекты
    - Медицинские учреждения
    - Заведения общепита
    """
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    # Название категории
    name = models.CharField(
        max_length=200,
        unique=True,
        verbose_name='Название'
    )
    
    # Описание категории
    description = models.TextField(
        blank=True,
        verbose_name='Описание'
    )
    
    # Иконка категории (путь к файлу или URL)
    icon = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Иконка'
    )
    
    # Цвет маркера на карте (hex код)
    marker_color = models.CharField(
        max_length=7,
        default='#FF0000',
        verbose_name='Цвет маркера'
    )
    
    # Порядок отображения в фильтрах
    display_order = models.IntegerField(
        default=0,
        verbose_name='Порядок отображения'
    )
    
    # Активна ли категория
    is_active = models.BooleanField(
        default=True,
        verbose_name='Активна'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    class Meta:
        verbose_name = 'Категория POI'
        verbose_name_plural = 'Категории POI'
        ordering = ['display_order', 'name']
    
    def __str__(self):
        return self.name


class POI(models.Model):
    """
    Точка интереса (Point of Interest) - объект инфраструктуры
    
    Хранит информацию об организациях:
    - Магазины
    - Аптеки
    - Спортивные объекты
    - Медицинские учреждения
    - Заведения общепита
    - И другие объекты
    """
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    # Название объекта
    name = models.CharField(
        max_length=500,
        verbose_name='Название'
    )
    
    # Категория объекта
    category = models.ForeignKey(
        POICategory,
        on_delete=models.PROTECT,
        related_name='pois',
        verbose_name='Категория'
    )
    
    # Адрес объекта (человекочитаемый)
    address = models.CharField(
        max_length=500,
        verbose_name='Адрес'
    )
    
    # Географические координаты
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name='Широта'
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name='Долгота'
    )
    
    # Описание объекта
    description = models.TextField(
        blank=True,
        verbose_name='Описание'
    )
    
    # Контактная информация
    phone = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Телефон'
    )
    website = models.URLField(
        blank=True,
        verbose_name='Веб-сайт'
    )
    email = models.EmailField(
        blank=True,
        verbose_name='Email'
    )
    
    # Время работы (может быть JSON или текстовое поле)
    working_hours = models.TextField(
        blank=True,
        verbose_name='Время работы'
    )
    
    # Флаг геокодирования (был ли адрес преобразован в координаты)
    is_geocoded = models.BooleanField(
        default=False,
        verbose_name='Геокодирован'
    )
    
    # Дата геокодирования
    geocoded_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата геокодирования'
    )
    
    # Дополнительные метаданные (JSON)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Метаданные'
    )
    
    # Связь со схемой анкеты
    form_schema = models.ForeignKey(
        'FormSchema',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pois',
        verbose_name='Схема анкеты'
    )
    
    # Заполненные данные анкеты (JSON)
    form_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Данные анкеты'
    )
    
    # Верификация объекта
    verified = models.BooleanField(
        default=False,
        verbose_name='Верифицирован'
    )
    
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_pois',
        verbose_name='Верифицировал'
    )
    
    verified_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата верификации'
    )
    
    # Поля для модерации
    MODERATION_STATUS_CHOICES = [
        ('pending', 'Ожидает модерации'),
        ('approved', 'Одобрено'),
        ('rejected', 'Отклонено'),
        ('changes_requested', 'Требуются изменения'),
    ]
    
    moderation_status = models.CharField(
        max_length=20,
        choices=MODERATION_STATUS_CHOICES,
        default='pending',  # Новые заявки требуют модерации
        verbose_name='Статус модерации'
    )
    
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submitted_pois',
        verbose_name='Создал'
    )
    
    moderated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='moderated_pois',
        verbose_name='Модератор'
    )
    
    moderated_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата модерации'
    )
    
    moderation_comment = models.TextField(
        blank=True,
        verbose_name='Комментарий модератора'
    )
    
    # Поле для вердикта LLM
    llm_verdict = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Вердикт LLM'
    )
    # Структура llm_verdict:
    # {
    #   "verdict": "approve|reject|review",
    #   "confidence": 0.0-1.0,
    #   "comment": "Текст комментария от LLM",
    #   "checked_at": "2024-01-01T00:00:00Z",
    #   "analysis": {
    #     "field_quality": "good|medium|poor",
    #     "health_impact": "positive|neutral|negative",
    #     "data_completeness": 0.0-1.0
    #   }
    # }
    
    # Активен ли объект
    is_active = models.BooleanField(
        default=True,
        verbose_name='Активен'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    class Meta:
        verbose_name = 'Точка интереса'
        verbose_name_plural = 'Точки интереса'
        ordering = ['name']
        indexes = [
            models.Index(fields=['latitude', 'longitude']),  # Для географических запросов
            models.Index(fields=['category', 'is_active']),  # Для фильтрации
            models.Index(fields=['is_active', 'created_at']),  # Для списков
        ]
    
    def __str__(self):
        return f"{self.name} ({self.category.name})"


class POIRating(models.Model):
    """
    Рейтинг "здоровости" объекта POI
    
    Рейтинг формируется на основе:
    - Пользовательских оценок
    - Отзывов (из модуля геймификации)
    - Внутренних характеристик объекта
    - Категории объекта
    """
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    # Связь с объектом POI
    poi = models.OneToOneField(
        POI,
        on_delete=models.CASCADE,
        related_name='rating',
        verbose_name='Объект'
    )
    
    # Интегральный рейтинг "здоровости" (0-100)
    # Теперь это алиас для S_HIS для обратной совместимости
    health_score = models.FloatField(
        default=50.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name='Индекс здоровья'
    )
    
    # Компоненты рейтинга
    S_infra = models.FloatField(
        default=50.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name='Инфраструктурный рейтинг'
    )
    
    S_social = models.FloatField(
        default=50.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name='Социальный рейтинг'
    )
    
    S_HIS = models.FloatField(
        default=50.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name='Health Impact Score'
    )
    
    # Количество отзывов (из модуля геймификации)
    reviews_count = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Количество отзывов'
    )
    
    # Количество подтвержденных отзывов
    approved_reviews_count = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Количество подтвержденных отзывов'
    )
    
    # Средняя оценка пользователей (1-5)
    average_user_rating = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1.0), MaxValueValidator(5.0)],
        verbose_name='Средняя оценка пользователей'
    )
    
    # Последнее обновление рейтинга
    last_calculated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Последний расчет'
    )
    
    # Метаданные расчета
    last_infra_calculation = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Последний расчет S_infra'
    )
    
    last_social_calculation = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Последний расчет S_social'
    )
    
    calculation_metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Метаданные расчета'
    )
    
    # Метод расчета рейтинга (для истории)
    calculation_method = models.CharField(
        max_length=100,
        default='weighted_average',
        verbose_name='Метод расчета'
    )
    
    # Дополнительные метрики (JSON)
    metrics = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Метрики'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    class Meta:
        verbose_name = 'Рейтинг POI'
        verbose_name_plural = 'Рейтинги POI'
        ordering = ['-health_score']
    
    def __str__(self):
        return f"{self.poi.name} - {self.health_score:.1f}"


class AreaAnalysis(models.Model):
    """
    История анализов областей (опционально, для кеширования результатов)
    
    Может использоваться для:
    - Кеширования результатов анализа
    - Истории запросов пользователей
    - Аналитики популярных областей
    """
    
    ANALYSIS_TYPE_CHOICES = [
        ('radius', 'Анализ по радиусу'),
        ('city', 'Анализ по городу/округу'),
        ('street', 'Анализ по улице/кварталу'),
    ]
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    # Тип анализа
    analysis_type = models.CharField(
        max_length=20,
        choices=ANALYSIS_TYPE_CHOICES,
        verbose_name='Тип анализа'
    )
    
    # Параметры области (JSON)
    # Для радиуса: {center_lat, center_lon, radius}
    # Для bounding box: {sw_lat, sw_lon, ne_lat, ne_lon}
    area_params = models.JSONField(
        verbose_name='Параметры области'
    )
    
    # Активные фильтры (список slug категорий)
    active_filters = models.JSONField(
        default=list,
        verbose_name='Активные фильтры'
    )
    
    # Результат анализа
    health_index = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name='Индекс здоровья'
    )
    
    # Статистика по категориям (JSON)
    category_stats = models.JSONField(
        default=dict,
        verbose_name='Статистика по категориям'
    )
    
    # Количество объектов в анализе
    objects_count = models.IntegerField(
        validators=[MinValueValidator(0)],
        verbose_name='Количество объектов'
    )
    
    # Человекочитаемое название области (если определено)
    area_name = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Название области'
    )
    
    # Пользователь, выполнивший анализ (опционально)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='area_analyses',
        verbose_name='Пользователь'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    
    class Meta:
        verbose_name = 'Анализ области'
        verbose_name_plural = 'Анализы областей'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['analysis_type', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_analysis_type_display()} - {self.health_index:.1f} ({self.created_at.date()})"

