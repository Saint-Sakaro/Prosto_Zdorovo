"""
Сигналы Django для модуля авторизации

Используется для автоматической обработки событий:
- Создание профиля геймификации при регистрации пользователя
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from gamification.utils import get_or_create_user_profile


@receiver(post_save, sender=User)
def create_gamification_profile(sender, instance, created, **kwargs):
    """
    Создает профиль геймификации при создании нового пользователя
    
    Args:
        sender: Модель User
        instance: Экземпляр User
        created: True если пользователь только что создан
        **kwargs: Дополнительные аргументы
    """
    if created:
        get_or_create_user_profile(instance)

