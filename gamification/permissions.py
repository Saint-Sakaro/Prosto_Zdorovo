"""
Кастомные разрешения для модуля геймификации

Определяет права доступа для различных действий:
- Модерация отзывов (только для модераторов)
- Просмотр статистики
- Управление наградами
"""

from rest_framework import permissions
from gamification.utils import get_or_create_user_profile
from django.utils import timezone


class IsModerator(permissions.BasePermission):
    """
    Разрешение для модераторов
    
    Проверяет, является ли пользователь модератором.
    Модератор определяется через группу 'Moderators' или флаг is_staff.
    """
    
    def has_permission(self, request, view):
        """
        Проверяет, имеет ли пользователь права модератора
        
        Args:
            request: HTTP запрос
            view: View или ViewSet
        
        Returns:
            bool: True если пользователь модератор
        """
        # TODO: Реализовать проверку прав модератора
        # 1. Проверить, аутентифицирован ли пользователь
        # 2. Проверить, является ли пользователь модератором:
        #    - Через группу 'Moderators'
        #    - Или через флаг is_staff
        #    - Или через кастомное поле в UserProfile
        # 3. Вернуть True/False
        
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Пример: проверка через группу
        # return request.user.groups.filter(name='Moderators').exists()
        
        # Или через is_staff
        return request.user.is_staff


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Разрешение: только владелец может редактировать
    
    Используется для профилей и наград пользователей
    """
    
    def has_object_permission(self, request, view, obj):
        """
        Проверяет права на объект
        
        Args:
            request: HTTP запрос
            view: View или ViewSet
            obj: Объект для проверки
        
        Returns:
            bool: True если пользователь может редактировать объект
        """
        # TODO: Реализовать проверку прав
        # 1. Если метод безопасный (GET, HEAD, OPTIONS) - разрешить
        # 2. Если объект имеет поле user или author - проверить совпадение с request.user
        # 3. Вернуть True/False
        
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Проверка для объектов с полем user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Проверка для объектов с полем author
        if hasattr(obj, 'author'):
            return obj.author == request.user
        
        return False


class CanPurchaseReward(permissions.BasePermission):
    """
    Разрешение для покупки наград
    
    Проверяет, может ли пользователь покупать награды
    (не заблокирован, имеет достаточно баллов и т.д.)
    """
    
    def has_permission(self, request, view):
        """
        Проверяет общие права на покупку
        
        Args:
            request: HTTP запрос
            view: View или ViewSet
        
        Returns:
            bool: True если пользователь может покупать награды
        """
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Проверяем блокировку через UserProfile
        profile = get_or_create_user_profile(request.user)
        if profile.is_banned:
            if profile.banned_until and profile.banned_until > timezone.now():
                return False  # Заблокирован до определенной даты
            elif profile.banned_until is None:
                return False  # Заблокирован бессрочно
        
        return True
    
    def has_object_permission(self, request, view, obj):
        """
        Проверяет права на конкретную награду
        
        Args:
            request: HTTP запрос
            view: View или ViewSet
            obj: Объект Reward
        
        Returns:
            bool: True если пользователь может купить эту награду
        """
        # TODO: Реализовать проверку
        # 1. Проверить доступность награды (is_available)
        # 2. Проверить достаточность баллов у пользователя
        # 3. Проверить наличие в наличии (stock_quantity)
        # 4. Вернуть True/False
        
        if not obj.is_available:
            return False
        
        # TODO: Проверить баланс баллов
        # profile = get_or_create_user_profile(request.user)
        # if profile.points_balance < obj.points_cost:
        #     return False
        
        # TODO: Проверить наличие в наличии
        # if obj.stock_quantity is not None and obj.stock_quantity <= 0:
        #     return False
        
        return True

