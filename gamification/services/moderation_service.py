"""
Сервис модерации отзывов

Обрабатывает действия модератора:
- Подтверждение отзыва
- Мягкий отказ
- Блокировка как спам
- Обновление статусов и начисление наград
"""

from django.db import transaction
from django.utils import timezone
from gamification.models import Review, ModerationLog, UserProfile
from gamification.services.reward_manager import RewardManager
from gamification.services.uniqueness_checker import UniquenessChecker


class ModerationService:
    """
    Класс для обработки модерации
    
    Методы:
    - approve_review(): Подтверждение отзыва
    - soft_reject_review(): Мягкий отказ
    - spam_block_review(): Блокировка как спам
    - get_pending_reviews(): Получение отзывов на модерацию
    """
    
    def __init__(self):
        self.reward_manager = RewardManager()
        self.uniqueness_checker = UniquenessChecker()
    
    @transaction.atomic
    def approve_review(self, review, moderator, comment=''):
        """
        Подтверждает отзыв и начисляет награды
        
        Args:
            review: Объект Review
            moderator: Пользователь-модератор
            comment: Комментарий модератора
        
        Returns:
            tuple: (Review, ModerationLog)
        """
        import time
        start_time = time.time()
        
        # Сохраняем старое значение статуса для проверки
        old_status = review.moderation_status
        
        # Проверяем, не был ли отзыв уже подтвержден
        if old_status == 'approved':
            # Отзыв уже подтвержден, не начисляем награды повторно
            # Но создаем лог модерации для аудита
            processing_time = time.time() - start_time
            moderation_log = ModerationLog.objects.create(
                moderator=moderator,
                review=review,
                action='approved',
                comment=f"Повторное подтверждение. {comment}",
                processing_time=processing_time
            )
            return review, moderation_log
        
        # Обновляем статус отзыва
        review.moderation_status = 'approved'
        review.moderated_by = moderator
        review.moderated_at = timezone.now()
        review.moderation_comment = comment
        
        # Проверяем уникальность, если еще не проверена
        if not review.is_unique:
            uniqueness_result = self.uniqueness_checker.check_uniqueness(
                review.latitude,
                review.longitude,
                review.category,
                review.review_type,
                review.created_at
            )
            review.is_unique = uniqueness_result['is_unique']
        
        review.save()
        
        # Начисляем награды только если статус изменился (не был approved)
        if old_status != 'approved':
            self.reward_manager.award_review(
                review,
                is_unique=review.is_unique,
                has_media=review.has_media
            )
        
        # Создаем лог модерации
        processing_time = time.time() - start_time
        moderation_log = ModerationLog.objects.create(
            moderator=moderator,
            review=review,
            action='approved',
            comment=comment,
            processing_time=processing_time
        )
        
        return review, moderation_log
    
    @transaction.atomic
    def soft_reject_review(self, review, moderator, comment=''):
        """
        Выполняет мягкий отказ (неактуален или недостаточно подтвержден)
        
        Args:
            review: Объект Review
            moderator: Пользователь-модератор
            comment: Комментарий модератора
        
        Returns:
            tuple: (Review, ModerationLog)
        """
        import time
        start_time = time.time()
        
        # Обновляем статус отзыва
        review.moderation_status = 'soft_reject'
        review.moderated_by = moderator
        review.moderated_at = timezone.now()
        review.moderation_comment = comment
        review.save()
        
        # НЕ начисляем награды (баллы и рейтинг не изменяются)
        
        # Создаем лог модерации
        processing_time = time.time() - start_time
        moderation_log = ModerationLog.objects.create(
            moderator=moderator,
            review=review,
            action='soft_rejected',
            comment=comment,
            processing_time=processing_time
        )
        
        return review, moderation_log
    
    @transaction.atomic
    def spam_block_review(self, review, moderator, comment=''):
        """
        Блокирует отзыв как спам и применяет штраф
        
        Args:
            review: Объект Review
            moderator: Пользователь-модератор
            comment: Комментарий модератора
        
        Returns:
            tuple: (Review, ModerationLog)
        """
        import time
        start_time = time.time()
        
        # Обновляем статус отзыва
        review.moderation_status = 'spam_blocked'
        review.moderated_by = moderator
        review.moderated_at = timezone.now()
        review.moderation_comment = comment
        review.save()
        
        # Применяем штраф
        self.reward_manager.apply_spam_penalty(review.author, review)
        
        # Проверяем необходимость блокировки аккаунта
        self._check_account_ban(review.author)
        
        # Создаем лог модерации
        processing_time = time.time() - start_time
        moderation_log = ModerationLog.objects.create(
            moderator=moderator,
            review=review,
            action='spam_blocked',
            comment=comment,
            processing_time=processing_time
        )
        
        return review, moderation_log
    
    def get_pending_reviews(self, filters=None):
        """
        Получает список отзывов, ожидающих модерации
        
        Args:
            filters: dict с фильтрами {
                'review_type': str,  # poi_review или incident
                'has_media': bool,  # Только с медиа
                'category': str,  # Категория
                'date_from': datetime,  # С даты
                'date_to': datetime,  # До даты
            }
        
        Returns:
            QuerySet: Отзывы в статусе pending
        """
        # Получаем все отзывы со статусом 'pending'
        queryset = Review.objects.filter(moderation_status='pending')
        
        # Применяем фильтры
        if filters:
            if 'review_type' in filters:
                queryset = queryset.filter(review_type=filters['review_type'])
            
            if 'has_media' in filters:
                queryset = queryset.filter(has_media=filters['has_media'])
            
            if 'category' in filters:
                queryset = queryset.filter(category=filters['category'])
            
            if 'date_from' in filters:
                queryset = queryset.filter(created_at__gte=filters['date_from'])
            
            if 'date_to' in filters:
                queryset = queryset.filter(created_at__lte=filters['date_to'])
        
        # Сортируем по дате создания (старые сначала)
        queryset = queryset.order_by('created_at')
        
        return queryset
    
    def _check_account_ban(self, user):
        """
        Проверяет необходимость блокировки аккаунта
        
        Args:
            user: Пользователь
        
        Returns:
            bool: True если аккаунт должен быть заблокирован
        """
        from django.conf import settings
        from datetime import timedelta
        from gamification.utils import get_or_create_user_profile
        
        # Получаем профиль
        user_profile = get_or_create_user_profile(user)
        
        # Проверяем порог
        spam_threshold = settings.GAMIFICATION_CONFIG.get('SPAM_THRESHOLD_FOR_BAN', 5)
        
        if user_profile.spam_count >= spam_threshold and not user_profile.is_banned:
            # Блокируем аккаунт
            user_profile.is_banned = True
            user_profile.banned_until = timezone.now() + timedelta(days=30)
            user_profile.save()
            return True
        
        return user_profile.is_banned

