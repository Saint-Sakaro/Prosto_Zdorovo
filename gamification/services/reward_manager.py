"""
Сервис управления наградами

Отвечает за:
- Начисление баллов и репутации пользователям
- Списание баллов при покупке наград
- Создание транзакций в истории
- Обновление профиля пользователя
"""

from django.db import transaction
from django.utils import timezone
from gamification.models import (
    UserProfile, RewardTransaction, Review, Reward, UserReward
)
from gamification.services.reward_calculator import RewardCalculator
from gamification.utils import get_or_create_user_profile, calculate_level_from_reputation


class RewardManager:
    """
    Класс для управления наградами
    
    Методы:
    - award_review(): Начисление награды за отзыв
    - award_points(): Начисление баллов
    - deduct_points(): Списание баллов
    - purchase_reward(): Покупка награды в маркетплейсе
    - apply_spam_penalty(): Применение штрафа за спам
    """
    
    def __init__(self):
        self.calculator = RewardCalculator()
    
    @transaction.atomic
    def award_review(self, review, is_unique, has_media):
        """
        Начисляет награду за отзыв
        
        Args:
            review: Объект Review
            is_unique: Является ли отзыв уникальным
            has_media: Есть ли медиа-доказательства
        
        Returns:
            RewardTransaction: Созданная транзакция
        """
        # Получаем или создаем профиль пользователя
        user_profile = get_or_create_user_profile(review.author)
        
        # Рассчитываем награду
        if review.review_type == 'incident':
            reward_data = self.calculator.calculate_incident_reward(review, is_unique, has_media)
        else:
            reward_data = self.calculator.calculate_review_reward(review, is_unique, has_media)
        
        # Обновляем профиль пользователя
        user_profile.points_balance += reward_data['points']
        user_profile.total_reputation += reward_data['reputation']
        user_profile.monthly_reputation += reward_data['monthly_reputation']
        
        # Если отзыв уникален, увеличиваем счетчик уникальных отзывов
        if is_unique:
            user_profile.unique_reviews_count += 1
        
        # Пересчитываем уровень
        new_level = calculate_level_from_reputation(
            user_profile.total_reputation,
            user_profile.unique_reviews_count
        )
        if new_level > user_profile.level:
            user_profile.level = new_level
        
        user_profile.save()
        
        # Определяем причину начисления
        if is_unique:
            reason = 'unique_review_approved'
        else:
            reason = 'duplicate_review'
        
        # Создаем транзакцию
        transaction_obj = RewardTransaction.objects.create(
            user=review.author,
            transaction_type='credit',
            amount=reward_data['points'],
            reason=reason,
            review=review,
            balance_after=user_profile.points_balance,
            metadata={
                'reputation': reward_data['reputation'],
                'monthly_reputation': reward_data['monthly_reputation'],
                'is_unique': is_unique,
                'has_media': has_media,
            }
        )
        
        return transaction_obj
    
    @transaction.atomic
    def award_points(self, user, points, reputation=0, monthly_reputation=0, reason='', review=None):
        """
        Начисляет баллы и репутацию пользователю
        
        Args:
            user: Пользователь
            points: Количество баллов
            reputation: Изменение общего рейтинга
            monthly_reputation: Изменение месячного рейтинга
            reason: Причина начисления (из RewardTransaction.REASON_CHOICES)
            review: Связанный отзыв (опционально)
        
        Returns:
            RewardTransaction: Созданная транзакция
        """
        # Получаем или создаем профиль
        user_profile = get_or_create_user_profile(user)
        
        # Обновляем показатели
        user_profile.points_balance += points
        user_profile.total_reputation += reputation
        user_profile.monthly_reputation += monthly_reputation
        
        # Пересчитываем уровень
        new_level = calculate_level_from_reputation(
            user_profile.total_reputation,
            user_profile.unique_reviews_count
        )
        if new_level > user_profile.level:
            user_profile.level = new_level
        
        user_profile.save()
        
        # Создаем транзакцию
        transaction_obj = RewardTransaction.objects.create(
            user=user,
            transaction_type='credit',
            amount=points,
            reason=reason,
            review=review,
            balance_after=user_profile.points_balance,
            metadata={
                'reputation': reputation,
                'monthly_reputation': monthly_reputation,
            }
        )
        
        return transaction_obj
    
    @transaction.atomic
    def deduct_points(self, user, points, reason='', reward=None):
        """
        Списывает баллы у пользователя
        
        Args:
            user: Пользователь
            points: Количество баллов для списания
            reason: Причина списания
            reward: Связанная награда (если покупка)
        
        Returns:
            RewardTransaction: Созданная транзакция
        
        Raises:
            ValueError: Если недостаточно баллов
        """
        # Получаем профиль
        user_profile = get_or_create_user_profile(user)
        
        # Проверяем достаточность баланса
        if user_profile.points_balance < points:
            raise ValueError(
                f"Недостаточно баллов. Текущий баланс: {user_profile.points_balance}, "
                f"требуется: {points}"
            )
        
        # Уменьшаем баланс
        user_profile.points_balance -= points
        user_profile.save()
        
        # Создаем транзакцию
        transaction_obj = RewardTransaction.objects.create(
            user=user,
            transaction_type='debit',
            amount=points,
            reason=reason,
            balance_after=user_profile.points_balance,
            metadata={
                'reward_uuid': str(reward.uuid) if reward else None,
            }
        )
        
        return transaction_obj
    
    @transaction.atomic
    def purchase_reward(self, user, reward):
        """
        Покупка награды в маркетплейсе
        
        Args:
            user: Пользователь
            reward: Объект Reward
        
        Returns:
            tuple: (UserReward, RewardTransaction)
        
        Raises:
            ValueError: Если недостаточно баллов или награда недоступна
        """
        # Проверяем доступность награды
        if not reward.is_available:
            raise ValueError(f"Награда '{reward.name}' недоступна для покупки")
        
        if reward.stock_quantity is not None and reward.stock_quantity <= 0:
            raise ValueError(f"Награда '{reward.name}' закончилась")
        
        # Списываем баллы
        transaction_obj = self.deduct_points(
            user,
            reward.points_cost,
            reason='reward_purchase',
            reward=reward
        )
        
        # Создаем UserReward
        user_reward = UserReward.objects.create(
            user=user,
            reward=reward,
            transaction=transaction_obj,
            status='active',
            metadata=reward.metadata.copy() if reward.metadata else {}
        )
        
        # Обновляем количество награды
        if reward.stock_quantity is not None:
            reward.stock_quantity -= 1
        reward.sold_quantity += 1
        reward.save()
        
        return user_reward, transaction_obj
    
    @transaction.atomic
    def apply_spam_penalty(self, user, review):
        """
        Применяет штраф за спам
        
        Args:
            user: Пользователь
            review: Отзыв, признанный спамом
        
        Returns:
            RewardTransaction: Транзакция со штрафом
        """
        from django.conf import settings
        
        # Получаем профиль
        user_profile = get_or_create_user_profile(user)
        
        # Рассчитываем штраф
        penalty = self.calculator.calculate_spam_penalty()
        
        # Уменьшаем репутацию (не ниже 0)
        reputation_penalty = penalty['reputation']
        user_profile.total_reputation = max(0, user_profile.total_reputation + reputation_penalty)
        
        # Увеличиваем счетчик спама
        user_profile.spam_count += 1
        
        # Проверяем порог для блокировки
        spam_threshold = settings.GAMIFICATION_CONFIG.get('SPAM_THRESHOLD_FOR_BAN', 5)
        if user_profile.spam_count >= spam_threshold:
            from datetime import timedelta
            user_profile.is_banned = True
            user_profile.banned_until = timezone.now() + timedelta(days=30)  # Блокировка на 30 дней
        
        user_profile.save()
        
        # Создаем транзакцию (с отрицательным reputation)
        transaction_obj = RewardTransaction.objects.create(
            user=user,
            transaction_type='debit',
            amount=0,  # Баллы не списываются, только репутация
            reason='spam_penalty',
            review=review,
            balance_after=user_profile.points_balance,
            metadata={
                'reputation_penalty': reputation_penalty,
                'spam_count': user_profile.spam_count,
                'is_banned': user_profile.is_banned,
            }
        )
        
        return transaction_obj
    
    def _update_user_level(self, user_profile):
        """
        Пересчитывает уровень пользователя на основе репутации и опыта
        
        Args:
            user_profile: UserProfile
        
        Returns:
            int: Новый уровень
        """
        new_level = calculate_level_from_reputation(
            user_profile.total_reputation,
            user_profile.unique_reviews_count
        )
        
        if new_level > user_profile.level:
            user_profile.level = new_level
            user_profile.save()
        
        return new_level

