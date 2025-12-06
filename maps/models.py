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
    
    # Слаг для URL и фильтров
    slug = models.SlugField(
        max_length=200,
        unique=True,
        verbose_name='Слаг'
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
    
    # Вес категории при расчете индекса "здоровости"
    # Положительные значения увеличивают индекс, отрицательные - уменьшают
    health_weight = models.FloatField(
        default=1.0,
        verbose_name='Вес для индекса здоровья'
    )
    
    # Важность категории для здоровья (0-10)
    health_importance = models.IntegerField(
        default=5,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name='Важность для здоровья'
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
    health_score = models.FloatField(
        default=50.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name='Индекс здоровья'
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

