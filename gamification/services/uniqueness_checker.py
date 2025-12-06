"""
Сервис проверки уникальности отзывов

Реализует алгоритм автоматической проверки уникальности перед начислением наград:
- Поиск существующих записей в радиусе R метров
- Проверка временного окна T (например, 24 часа)
- Проверка категории отзыва
- Определение является ли отзыв уникальным или дубликатом
"""

from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from geopy.distance import geodesic
from gamification.models import Review


class UniquenessChecker:
    """
    Класс для проверки уникальности отзывов
    
    Методы:
    - check_uniqueness(): Основной метод проверки уникальности
    - find_nearby_reviews(): Поиск отзывов в радиусе
    - calculate_distance(): Вычисление расстояния между точками
    """
    
    def __init__(self):
        """
        Инициализация с параметрами из настроек
        """
        self.radius_meters = settings.GAMIFICATION_CONFIG.get('UNIQUENESS_RADIUS_METERS', 50)
        self.time_window_hours = settings.GAMIFICATION_CONFIG.get('UNIQUENESS_TIME_WINDOW_HOURS', 24)
    
    def check_uniqueness(self, latitude, longitude, category, review_type, created_at=None):
        """
        Проверяет уникальность отзыва по координатам, категории и времени
        
        Args:
            latitude: Широта точки
            longitude: Долгота точки
            category: Категория отзыва
            review_type: Тип отзыва (poi_review или incident)
            created_at: Время создания (если None, используется текущее время)
        
        Returns:
            dict: {
                'is_unique': bool,  # Является ли отзыв уникальным
                'nearby_reviews': list,  # Список найденных близких отзывов
                'duplicate_count': int,  # Количество дубликатов
            }
        """
        if created_at is None:
            created_at = timezone.now()
        
        # Определяем временное окно
        time_window_end = created_at
        time_window_start = created_at - timedelta(hours=self.time_window_hours)
        
        # Находим отзывы в радиусе и временном окне
        nearby_reviews = self.find_nearby_reviews(
            latitude, longitude, category, review_type,
            time_window_start, time_window_end
        )
        
        # Если найдены отзывы - это дубликат
        duplicate_count = len(nearby_reviews)
        is_unique = duplicate_count == 0
        
        return {
            'is_unique': is_unique,
            'nearby_reviews': list(nearby_reviews),
            'duplicate_count': duplicate_count,
        }
    
    def find_nearby_reviews(self, latitude, longitude, category, review_type, time_window_start, time_window_end):
        """
        Находит отзывы в указанном радиусе и временном окне
        
        Args:
            latitude: Широта центральной точки
            longitude: Долгота центральной точки
            category: Категория для фильтрации
            review_type: Тип отзыва
            time_window_start: Начало временного окна
            time_window_end: Конец временного окна
        
        Returns:
            QuerySet: Отзывы в радиусе и временном окне
        """
        # Получаем все отзывы с той же категорией и типом в временном окне
        # Исключаем спам и учитываем только активные отзывы
        reviews = Review.objects.filter(
            category=category,
            review_type=review_type,
            created_at__gte=time_window_start,
            created_at__lte=time_window_end,
        ).exclude(
            moderation_status='spam_blocked'
        )
        
        # Фильтруем по радиусу, вычисляя расстояние для каждого отзыва
        nearby_reviews = []
        for review in reviews:
            distance = self.calculate_distance(
                float(latitude),
                float(longitude),
                float(review.latitude),
                float(review.longitude)
            )
            if distance <= self.radius_meters:
                nearby_reviews.append(review)
        
        return nearby_reviews
    
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """
        Вычисляет расстояние между двумя точками в метрах
        
        Args:
            lat1, lon1: Координаты первой точки
            lat2, lon2: Координаты второй точки
        
        Returns:
            float: Расстояние в метрах
        """
        return geodesic((lat1, lon1), (lat2, lon2)).meters

