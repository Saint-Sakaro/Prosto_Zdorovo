"""
Сервис расчета наград

Вычисляет количество баллов и репутации для различных действий пользователя:
- Подтвержденный уникальный отзыв
- Дубликат/подтверждение отзыва
- Отзыв с медиа-доказательствами
- Фиксация инцидента
- И другие действия
"""

from django.conf import settings
from gamification.models import Review, UserProfile


class RewardCalculator:
    """
    Класс для расчета наград
    
    Методы:
    - calculate_review_reward(): Расчет награды за отзыв
    - calculate_incident_reward(): Расчет награды за инцидент
    - apply_media_bonus(): Применение бонуса за медиа
    - apply_uniqueness_bonus(): Применение бонуса за уникальность
    """
    
    def __init__(self):
        """
        Инициализация с параметрами из настроек
        """
        self.points_for_unique = settings.GAMIFICATION_CONFIG.get('POINTS_FOR_UNIQUE_REVIEW', 100)
        self.points_for_duplicate = settings.GAMIFICATION_CONFIG.get('POINTS_FOR_DUPLICATE', 10)
        self.reputation_for_unique = settings.GAMIFICATION_CONFIG.get('REPUTATION_FOR_UNIQUE_REVIEW', 50)
        self.reputation_penalty = settings.GAMIFICATION_CONFIG.get('REPUTATION_PENALTY_FOR_SPAM', 20)
    
    def calculate_review_reward(self, review, is_unique, has_media):
        """
        Рассчитывает награду за отзыв
        
        Args:
            review: Объект Review
            is_unique: Является ли отзыв уникальным
            has_media: Есть ли медиа-доказательства
        
        Returns:
            dict: {
                'points': int,  # Количество баллов
                'reputation': int,  # Изменение репутации
                'monthly_reputation': int,  # Изменение месячного рейтинга
            }
        """
        if is_unique:
            # Уникальный отзыв - максимальные награды
            points = self.points_for_unique
            reputation = self.reputation_for_unique
            monthly_reputation = self.reputation_for_unique
            
            # Бонус за медиа
            if has_media:
                bonus_result = self.apply_media_bonus(points, reputation)
                points = bonus_result['points']
                reputation = bonus_result['reputation']
                monthly_reputation = reputation  # Месячный рейтинг равен общему
        else:
            # Дубликат - минимальные награды
            points = self.points_for_duplicate
            reputation = 0  # Дубликаты не дают репутацию
            monthly_reputation = 0
        
        return {
            'points': int(points),
            'reputation': int(reputation),
            'monthly_reputation': int(monthly_reputation),
        }
    
    def calculate_incident_reward(self, review, is_unique, has_media):
        """
        Рассчитывает награду за фиксацию инцидента
        
        Args:
            review: Объект Review типа incident
            is_unique: Является ли инцидент уникальным
            has_media: Есть ли медиа-доказательства
        
        Returns:
            dict: {
                'points': int,
                'reputation': int,
                'monthly_reputation': int,
            }
        """
        # Инциденты могут иметь повышенные коэффициенты награждения
        # Используем базовый расчет, но можно переопределить коэффициенты
        base_reward = self.calculate_review_reward(review, is_unique, has_media)
        
        # Для инцидентов можно увеличить награду (например, на 20%)
        if is_unique:
            base_reward['points'] = int(base_reward['points'] * 1.2)
            base_reward['reputation'] = int(base_reward['reputation'] * 1.2)
            base_reward['monthly_reputation'] = int(base_reward['monthly_reputation'] * 1.2)
        
        return base_reward
    
    def apply_media_bonus(self, base_points, base_reputation):
        """
        Применяет бонус за наличие медиа-доказательств
        
        Args:
            base_points: Базовые баллы
            base_reputation: Базовая репутация
        
        Returns:
            dict: {
                'points': int,  # Баллы с бонусом
                'reputation': int,  # Репутация с бонусом
            }
        """
        # Бонус 50% за медиа-доказательства
        media_bonus_multiplier = 1.5
        
        points_with_bonus = base_points * media_bonus_multiplier
        reputation_with_bonus = base_reputation * media_bonus_multiplier
        
        return {
            'points': int(points_with_bonus),
            'reputation': int(reputation_with_bonus),
        }
    
    def calculate_spam_penalty(self):
        """
        Рассчитывает штраф за спам
        
        Returns:
            dict: {
                'reputation': int,  # Отрицательное значение (штраф)
            }
        """
        return {'reputation': -self.reputation_penalty}

