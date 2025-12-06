"""
Сервис таблиц лидеров

Отвечает за:
- Глобальную таблицу лидеров (по общему рейтингу)
- Месячную таблицу лидеров (по месячному рейтингу)
- Фильтрацию по регионам/городам
- Обработку равных результатов
"""

from django.db.models import Q
from django.utils import timezone
from datetime import datetime, timedelta
from gamification.models import UserProfile


class LeaderboardService:
    """
    Класс для работы с таблицами лидеров
    
    Методы:
    - get_global_leaderboard(): Глобальная таблица лидеров
    - get_monthly_leaderboard(): Месячная таблица лидеров
    - get_user_position(): Позиция пользователя в таблице
    - get_top_n_users(): Топ N пользователей
    """
    
    def get_global_leaderboard(self, limit=100, offset=0, region=None):
        """
        Получает глобальную таблицу лидеров по общему рейтингу
        
        Args:
            limit: Количество записей
            offset: Смещение для пагинации
            region: Фильтр по региону/городу (если есть поле в UserProfile)
        
        Returns:
            list: Список словарей с данными пользователей и их позициями
        """
        # Получаем QuerySet, отсортированный по total_reputation (убывание)
        queryset = UserProfile.objects.filter(
            is_banned=False
        ).order_by('-total_reputation', '-unique_reviews_count')
        
        # Применяем фильтр по региону (если в будущем добавится поле region)
        # if region:
        #     queryset = queryset.filter(region=region)
        
        # Применяем пагинацию
        total_count = queryset.count()
        profiles = queryset[offset:offset + limit]
        
        # Формируем список с позициями
        leaderboard = []
        for index, profile in enumerate(profiles):
            leaderboard.append({
                'rank': offset + index + 1,
                'user_uuid': str(profile.uuid),
                'username': profile.user.username,
                'total_reputation': profile.total_reputation,
                'monthly_reputation': profile.monthly_reputation,
                'level': profile.level,
                'unique_reviews_count': profile.unique_reviews_count,
                'points_balance': profile.points_balance,
            })
        
        return leaderboard
    
    def get_monthly_leaderboard(self, month=None, year=None, limit=100, offset=0, region=None):
        """
        Получает месячную таблицу лидеров
        
        Args:
            month: Месяц (1-12), если None - текущий месяц
            year: Год, если None - текущий год
            limit: Количество записей
            offset: Смещение
            region: Фильтр по региону
        
        Returns:
            list: Список словарей с данными пользователей
        """
        # Определяем месяц и год
        if month is None:
            month = timezone.now().month
        if year is None:
            year = timezone.now().year
        
        # Получаем QuerySet, отсортированный по monthly_reputation
        queryset = UserProfile.objects.filter(
            is_banned=False
        ).order_by('-monthly_reputation', '-total_reputation')
        
        # Применяем фильтр по региону (если в будущем добавится поле region)
        # if region:
        #     queryset = queryset.filter(region=region)
        
        # Применяем пагинацию
        profiles = queryset[offset:offset + limit]
        
        # Формируем список с позициями
        leaderboard = []
        for index, profile in enumerate(profiles):
            leaderboard.append({
                'rank': offset + index + 1,
                'user_uuid': str(profile.uuid),
                'username': profile.user.username,
                'total_reputation': profile.total_reputation,
                'monthly_reputation': profile.monthly_reputation,
                'level': profile.level,
                'unique_reviews_count': profile.unique_reviews_count,
                'points_balance': profile.points_balance,
            })
        
        return leaderboard
    
    def get_user_position(self, user, leaderboard_type='global'):
        """
        Получает позицию пользователя в таблице лидеров
        
        Args:
            user: Пользователь
            leaderboard_type: 'global' или 'monthly'
        
        Returns:
            int: Позиция пользователя (1-based) или None если не найден
        """
        try:
            user_profile = UserProfile.objects.get(user=user, is_banned=False)
        except UserProfile.DoesNotExist:
            return None
        
        if leaderboard_type == 'global':
            # Используем ту же сортировку, что и в get_global_leaderboard
            # order_by('-total_reputation', '-unique_reviews_count')
            queryset = UserProfile.objects.filter(
                is_banned=False
            ).order_by('-total_reputation', '-unique_reviews_count')
            
            # Получаем список всех профилей в правильном порядке
            all_profiles = list(queryset.values_list('id', flat=True))
            
            # Находим индекс текущего пользователя
            try:
                position = all_profiles.index(user_profile.id) + 1
            except ValueError:
                return None
        else:  # monthly
            # Используем ту же сортировку, что и в get_monthly_leaderboard
            # order_by('-monthly_reputation', '-total_reputation')
            queryset = UserProfile.objects.filter(
                is_banned=False
            ).order_by('-monthly_reputation', '-total_reputation')
            
            # Получаем список всех профилей в правильном порядке
            all_profiles = list(queryset.values_list('id', flat=True))
            
            # Находим индекс текущего пользователя
            try:
                position = all_profiles.index(user_profile.id) + 1
            except ValueError:
                return None
        
        return position
    
    def get_top_n_users(self, n=10, leaderboard_type='monthly', region=None):
        """
        Получает топ N пользователей для месячных наград
        
        Args:
            n: Количество пользователей
            leaderboard_type: 'global' или 'monthly'
            region: Фильтр по региону
        
        Returns:
            list: Список топ N пользователей
        """
        if leaderboard_type == 'global':
            return self.get_global_leaderboard(limit=n, offset=0, region=region)
        else:
            return self.get_monthly_leaderboard(limit=n, offset=0, region=region)
    
    def _calculate_rank(self, queryset, user_profile, field_name):
        """
        Вычисляет позицию пользователя в QuerySet
        
        Args:
            queryset: QuerySet UserProfile
            user_profile: Профиль пользователя
            field_name: Имя поля для сравнения ('total_reputation' или 'monthly_reputation')
        
        Returns:
            int: Позиция (1-based)
        """
        field_value = getattr(user_profile, field_name)
        
        # Фильтруем queryset по полю
        filter_kwargs = {
            f'{field_name}__gt': field_value,
            'is_banned': False,
        }
        count = queryset.filter(**filter_kwargs).count()
        
        return count + 1

