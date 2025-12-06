"""
Утилиты для модуля геймификации

Вспомогательные функции и классы:
- Создание профиля пользователя
- Валидация данных
- Форматирование
- Константы
"""

from django.contrib.auth.models import User
from gamification.models import UserProfile


def get_or_create_user_profile(user):
    """
    Получить или создать профиль геймификации для пользователя
    
    Args:
        user: Объект User
    
    Returns:
        UserProfile: Профиль пользователя
    """
    # TODO: Реализовать получение или создание профиля
    # 1. Попытаться получить существующий UserProfile
    # 2. Если не существует - создать новый с дефолтными значениями
    # 3. Вернуть профиль
    
    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            'total_reputation': 0,
            'monthly_reputation': 0,
            'points_balance': 0,
            'level': 1,
            'experience': 0,
        }
    )
    return profile


def calculate_level_from_reputation(total_reputation, unique_reviews_count=0):
    """
    Вычисляет уровень пользователя на основе репутации
    
    Args:
        total_reputation: Общий рейтинг
        unique_reviews_count: Количество уникальных отзывов
    
    Returns:
        int: Уровень пользователя
    """
    # TODO: Реализовать расчет уровня
    # Формула может быть:
    # level = floor(sqrt(total_reputation / 100)) + 1
    # Или более сложная с учетом unique_reviews_count
    
    import math
    if total_reputation <= 0:
        return 1
    
    # Примерная формула: уровень растет медленнее с увеличением репутации
    level = int(math.sqrt(total_reputation / 100)) + 1
    return max(1, level)


def calculate_experience_to_next_level(current_level, current_experience):
    """
    Вычисляет опыт, необходимый для следующего уровня
    
    Args:
        current_level: Текущий уровень
        current_experience: Текущий опыт
    
    Returns:
        int: Опыт до следующего уровня
    """
    # TODO: Реализовать расчет опыта
    # Формула может быть: experience_needed = (level * 100) - current_experience
    
    experience_needed = (current_level * 100) - current_experience
    return max(0, experience_needed)


def format_reputation(reputation):
    """
    Форматирует репутацию для отображения
    
    Args:
        reputation: Значение репутации
    
    Returns:
        str: Отформатированная строка (например, "1.5K", "2.3M")
    """
    # TODO: Реализовать форматирование
    # Если reputation >= 1000000: вернуть "X.XM"
    # Если reputation >= 1000: вернуть "X.XK"
    # Иначе: вернуть число как строку
    
    if reputation >= 1000000:
        return f"{reputation / 1000000:.1f}M"
    elif reputation >= 1000:
        return f"{reputation / 1000:.1f}K"
    else:
        return str(reputation)


def validate_coordinates(latitude, longitude):
    """
    Валидирует географические координаты
    
    Args:
        latitude: Широта
        longitude: Долгота
    
    Returns:
        bool: True если координаты валидны
    
    Raises:
        ValueError: Если координаты невалидны
    """
    # TODO: Реализовать валидацию
    # Широта должна быть в диапазоне [-90, 90]
    # Долгота должна быть в диапазоне [-180, 180]
    
    if not (-90 <= latitude <= 90):
        raise ValueError(f"Широта должна быть в диапазоне [-90, 90], получено: {latitude}")
    
    if not (-180 <= longitude <= 180):
        raise ValueError(f"Долгота должна быть в диапазоне [-180, 180], получено: {longitude}")
    
    return True


def get_review_type_display_name(review_type):
    """
    Получить отображаемое название типа отзыва
    
    Args:
        review_type: Тип отзыва ('poi_review' или 'incident')
    
    Returns:
        str: Отображаемое название
    """
    # TODO: Вернуть человекочитаемое название
    display_names = {
        'poi_review': 'Отзыв о POI',
        'incident': 'Инцидент',
    }
    return display_names.get(review_type, review_type)


def get_moderation_status_display_name(status):
    """
    Получить отображаемое название статуса модерации
    
    Args:
        status: Статус модерации
    
    Returns:
        str: Отображаемое название
    """
    # TODO: Вернуть человекочитаемое название
    display_names = {
        'pending': 'Ожидает модерации',
        'approved': 'Подтвержден',
        'soft_reject': 'Неактуален',
        'spam_blocked': 'Спам',
    }
    return display_names.get(status, status)

