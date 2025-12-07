"""
Сервис расчета динамического социального рейтинга (S_social)

Реализует расчет рейтинга на основе отзывов пользователей
с учетом времени создания (time decay) и репутации авторов.
"""

from django.utils import timezone
from datetime import timedelta
from gamification.models import Review
from gamification.models import UserProfile
import math


class SocialScoreCalculator:
    """
    Класс для расчета социального рейтинга по отзывам
    
    Методы:
    - calculate_social_score(): Расчет S_social для объекта
    - calculate_time_decay(): Расчет временного коэффициента
    - calculate_author_weight(): Расчет веса по репутации автора
    - normalize_rating(): Нормализация оценки отзыва в [0;1]
    """
    
    def __init__(self):
        """
        Инициализация с параметрами из настроек
        """
        # Период полураспада для time decay (в днях)
        self.half_life_days = 180  # Можно вынести в settings
        
        # Веса по репутации автора
        self.author_weights = {
            'novice': 0.5,      # Новичок (репутация < 100)
            'active': 1.0,      # Активный (репутация 100-1000)
            'expert': 1.5,      # Эксперт (репутация > 1000)
        }
    
    def calculate_social_score(self, poi, reviews=None):
        """
        Рассчитывает социальный рейтинг на основе отзывов
        
        Args:
            poi: Объект POI
            reviews: QuerySet отзывов (если None - загрузит автоматически)
        
        Returns:
            float: S_social в диапазоне 0-100
        """
        if reviews is None:
            # Получаем отзывы для POI
            reviews = self._get_poi_reviews(poi)
        
        # Фильтруем только подтвержденные отзывы с оценкой
        approved_reviews = reviews.filter(
            moderation_status='approved',
            rating__isnull=False
        )
        
        if not approved_reviews.exists():
            return 50.0  # Нейтральное значение при отсутствии отзывов
        
        total_weighted_score = 0.0
        total_weight = 0.0
        
        current_time = timezone.now()
        
        for review in approved_reviews.select_related('author__gamification_profile'):
            # Нормализуем оценку отзыва
            normalized_rating = self.normalize_rating(review.rating)
            
            # Рассчитываем time decay
            time_weight = self.calculate_time_decay(review.created_at, current_time)
            
            # Рассчитываем вес автора
            author_weight = self.calculate_author_weight(review.author)
            
            # Итоговый вес отзыва
            review_weight = time_weight * author_weight
            
            # Взвешенный вклад отзыва
            total_weighted_score += normalized_rating * review_weight
            total_weight += review_weight
        
        # Рассчитываем средневзвешенное значение
        if total_weight > 0:
            raw_score = total_weighted_score / total_weight
        else:
            raw_score = 0.5
        
        # Нормализуем в диапазон 0-100
        S_social = max(0.0, min(100.0, raw_score * 100.0))
        
        return round(S_social, 2)
    
    def calculate_time_decay(self, review_time, current_time=None):
        """
        Рассчитывает временной коэффициент (time decay)
        
        Формула: w_time = 2^(-Δt / T_1/2)
        Где Δt - возраст отзыва в днях, T_1/2 - период полураспада
        
        Args:
            review_time: Время создания отзыва
            current_time: Текущее время (если None - используется timezone.now())
        
        Returns:
            float: Временной коэффициент [0;1]
        """
        if current_time is None:
            current_time = timezone.now()
        
        age_days = (current_time - review_time).total_seconds() / 86400.0
        
        # Формула экспоненциального затухания
        time_weight = math.pow(2, -age_days / self.half_life_days)
        
        return max(0.0, min(1.0, time_weight))
    
    def calculate_author_weight(self, author):
        """
        Рассчитывает вес отзыва на основе репутации автора
        
        Args:
            author: Объект User
        
        Returns:
            float: Вес автора
        """
        try:
            profile = author.gamification_profile
            reputation = profile.total_reputation
        except UserProfile.DoesNotExist:
            reputation = 0
        
        # Определяем категорию по репутации
        if reputation < 100:
            return self.author_weights['novice']
        elif reputation < 1000:
            return self.author_weights['active']
        else:
            return self.author_weights['expert']
    
    def normalize_rating(self, rating):
        """
        Нормализует оценку отзыва (1-5) в диапазон [0;1]
        
        Формула: s = (r - 1) / (5 - 1)
        
        Args:
            rating: Оценка отзыва (1-5)
        
        Returns:
            float: Нормализованное значение [0;1]
        """
        if rating is None:
            return 0.5  # Нейтральное значение
        
        rating = max(1, min(5, int(rating)))
        normalized = (rating - 1) / 4.0
        
        return max(0.0, min(1.0, normalized))
    
    def _get_poi_reviews(self, poi):
        """
        Получить отзывы для POI
        
        Args:
            poi: Объект POI
        
        Returns:
            QuerySet: Отзывы для объекта
        """
        # Сначала проверяем прямую связь
        if hasattr(poi, 'reviews'):
            return poi.reviews.filter(review_type='poi_review')
        
        # Если прямой связи нет - ищем по координатам
        from geopy.distance import geodesic
        
        reviews = Review.objects.filter(
            review_type='poi_review',
            latitude__isnull=False,
            longitude__isnull=False
        )
        
        # Фильтруем по радиусу 50 метров
        poi_reviews = []
        for review in reviews:
            distance = geodesic(
                (float(poi.latitude), float(poi.longitude)),
                (float(review.latitude), float(review.longitude))
            ).meters
            
            if distance <= 50:
                poi_reviews.append(review.id)
        
        return Review.objects.filter(id__in=poi_reviews)

