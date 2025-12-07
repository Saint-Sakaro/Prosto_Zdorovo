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
import logging
from gamification.models import Review, UserProfile
from maps.services.llm_service import LLMService

logger = logging.getLogger(__name__)


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
        self.llm_service = LLMService()  # Для анализа качества отзывов
    
    def calculate_review_reward(self, review, is_unique, has_media):
        """
        Рассчитывает награду за отзыв с учетом анализа полноты и востребованности через GigaChat
        
        Args:
            review: Объект Review
            is_unique: Является ли отзыв уникальным
            has_media: Есть ли медиа-доказательства
        
        Returns:
            dict: {
                'points': int,  # Количество баллов
                'reputation': int,  # Изменение репутации
                'monthly_reputation': int,  # Изменение месячного рейтинга
                'quality_analysis': dict,  # Результат анализа качества (опционально)
            }
        """
        # Анализируем качество отзыва через GigaChat
        quality_analysis = None
        quality_multiplier = 1.0
        
        try:
            category_name = None
            if review.poi and review.poi.category:
                category_name = review.poi.category.name
            
            quality_analysis = self.llm_service.analyze_review_quality(
                review_text=review.content,
                category=category_name or review.category,
                has_media=has_media
            )
            
            # Рассчитываем множитель на основе качества
            # Используем среднее между полнотой и востребованностью
            avg_quality = (quality_analysis['completeness_score'] + quality_analysis['usefulness_score']) / 2
            
            # Множитель: от 0.5 (низкое качество) до 1.5 (высокое качество)
            quality_multiplier = 0.5 + (avg_quality * 1.0)
            
            logger = logging.getLogger(__name__)
            logger.info(f'Review quality analysis: completeness={quality_analysis["completeness_score"]:.2f}, '
                       f'usefulness={quality_analysis["usefulness_score"]:.2f}, '
                       f'multiplier={quality_multiplier:.2f}')
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.warning(f'Failed to analyze review quality: {str(e)}')
            # При ошибке используем базовый множитель
            quality_multiplier = 1.0
        
        if is_unique:
            # Уникальный отзыв - базовые награды с учетом качества
            base_points = self.points_for_unique
            base_reputation = self.reputation_for_unique
            
            # Применяем множитель качества
            points = int(base_points * quality_multiplier)
            reputation = int(base_reputation * quality_multiplier)
            monthly_reputation = reputation
            
            # Бонус за медиа (применяется после учета качества)
            if has_media:
                bonus_result = self.apply_media_bonus(points, reputation)
                points = bonus_result['points']
                reputation = bonus_result['reputation']
                monthly_reputation = reputation
        else:
            # Дубликат - минимальные награды (качество не учитывается для дубликатов)
            points = self.points_for_duplicate
            reputation = 0  # Дубликаты не дают репутацию
            monthly_reputation = 0
            
            # Бонус за медиа даже для дубликатов (но меньше)
            if has_media:
                points = int(points * 1.5)  # +50% за фото даже для дубликатов
        
        result = {
            'points': int(points),
            'reputation': int(reputation),
            'monthly_reputation': int(monthly_reputation),
        }
        
        # Добавляем анализ качества в результат (для логирования и метаданных)
        if quality_analysis:
            result['quality_analysis'] = quality_analysis
            result['quality_multiplier'] = quality_multiplier
        
        return result
    
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
        Применяет бонус за наличие медиа-доказательств (фото)
        
        За фото пользователь получает значительно больше баллов!
        
        Args:
            base_points: Базовые баллы
            base_reputation: Базовая репутация
        
        Returns:
            dict: {
                'points': int,  # Баллы с бонусом
                'reputation': int,  # Репутация с бонусом
            }
        """
        # Бонус 100% за медиа-доказательства (фото) - удваиваем награду!
        # Это мотивирует пользователей прикреплять фото
        media_bonus_multiplier = 2.0
        
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

