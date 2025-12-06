"""
Сигналы Django для модуля геймификации

Используется для автоматической обработки событий:
- Создание профиля при регистрации пользователя
- Автоматическая проверка достижений
- Обновление статистики
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from gamification.models import UserProfile, Review
from gamification.utils import get_or_create_user_profile
from gamification.tasks import check_achievements


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Создает профиль геймификации при создании нового пользователя
    
    Args:
        sender: Модель User
        instance: Экземпляр User
        created: True если пользователь только что создан
        **kwargs: Дополнительные аргументы
    """
    # TODO: Реализовать создание профиля
    # 1. Если пользователь только что создан (created=True)
    # 2. Создать UserProfile с дефолтными значениями
    # 3. Сохранить профиль
    
    if created:
        get_or_create_user_profile(instance)


@receiver(post_save, sender=Review)
def handle_review_created(sender, instance, created, **kwargs):
    """
    Обрабатывает создание нового отзыва
    
    Args:
        sender: Модель Review
        instance: Экземпляр Review
        created: True если отзыв только что создан
        **kwargs: Дополнительные аргументы
    """
    # TODO: Реализовать обработку создания отзыва
    # 1. Если отзыв только что создан
    # 2. Проверить уникальность (если еще не проверена)
    # 3. Если не уникален - начислить минимальные баллы
    # 4. Если уникален - оставить статус pending для модерации
    # 5. Запустить задачу проверки достижений (асинхронно)
    
    if created:
        # Проверка уникальности и начисление наград
        # выполняется в ViewSet.perform_create()
        # Здесь можно запустить проверку достижений
        check_achievements.delay(instance.author.id)


@receiver(post_save, sender=Review)
def handle_review_moderated(sender, instance, **kwargs):
    """
    Обрабатывает изменение статуса модерации отзыва
    
    Args:
        sender: Модель Review
        instance: Экземпляр Review
        **kwargs: Дополнительные аргументы
    """
    # TODO: Реализовать обработку модерации
    # 1. Проверить, изменился ли статус модерации
    # 2. Если статус изменился на 'approved':
    #    - Награды уже начислены в ModerationService
    #    - Запустить проверку достижений
    # 3. Если статус изменился на 'spam_blocked':
    #    - Штраф уже применен в ModerationService
    #    - Проверить необходимость блокировки аккаунта
    
    # Проверка изменения статуса выполняется через pre_save
    pass


@receiver(pre_save, sender=Review)
def track_moderation_status_change(sender, instance, **kwargs):
    """
    Отслеживает изменение статуса модерации
    
    Args:
        sender: Модель Review
        instance: Экземпляр Review
        **kwargs: Дополнительные аргументы
    """
    # TODO: Реализовать отслеживание изменений
    # 1. Если это обновление существующего отзыва (instance.pk существует)
    # 2. Получить старый объект из базы
    # 3. Сравнить старый и новый статус модерации
    # 4. Сохранить информацию об изменении (можно в instance._moderation_changed)
    # 5. Это будет использовано в post_save для обработки изменений
    
    if instance.pk:
        try:
            old_instance = Review.objects.get(pk=instance.pk)
            if old_instance.moderation_status != instance.moderation_status:
                # Статус изменился
                instance._moderation_status_changed = True
                instance._old_moderation_status = old_instance.moderation_status
        except Review.DoesNotExist:
            pass

