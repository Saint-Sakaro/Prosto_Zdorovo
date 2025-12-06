"""
Админ-панель Django для модуля геймификации

Настройка интерфейса администратора для:
- Управления пользователями и профилями
- Модерации отзывов
- Управления наградами
- Просмотра статистики
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from gamification.models import (
    UserProfile, Review, RewardTransaction, Reward, UserReward,
    Achievement, UserAchievement, ModerationLog
)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """
    Админ-панель для профилей пользователей
    """
    list_display = [
        'user', 'total_reputation', 'monthly_reputation',
        'points_balance', 'level', 'unique_reviews_count',
        'is_banned', 'created_at'
    ]
    list_filter = ['is_banned', 'level', 'created_at']
    search_fields = ['user__username', 'user__email', 'uuid']
    readonly_fields = ['uuid', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Пользователь', {
            'fields': ('user', 'uuid')
        }),
        ('Рейтинги', {
            'fields': ('total_reputation', 'monthly_reputation', 'points_balance')
        }),
        ('Прогресс', {
            'fields': ('level', 'experience', 'unique_reviews_count')
        }),
        ('Блокировка', {
            'fields': ('is_banned', 'banned_until', 'spam_count')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """
    Админ-панель для отзывов
    """
    list_display = [
        'uuid', 'author', 'review_type', 'category',
        'moderation_status', 'is_unique', 'has_media',
        'created_at', 'moderated_at'
    ]
    list_filter = [
        'review_type', 'moderation_status', 'is_unique',
        'has_media', 'category', 'created_at'
    ]
    search_fields = ['uuid', 'author__username', 'content', 'category']
    readonly_fields = ['uuid', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('uuid', 'author', 'review_type', 'category')
        }),
        ('Содержание', {
            'fields': ('content', 'has_media', 'latitude', 'longitude')
        }),
        ('Модерация', {
            'fields': (
                'moderation_status', 'is_unique',
                'moderated_by', 'moderated_at', 'moderation_comment'
            )
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    actions = ['approve_selected', 'soft_reject_selected', 'spam_block_selected']
    
    def approve_selected(self, request, queryset):
        """
        Массовое подтверждение отзывов
        """
        from gamification.services.moderation_service import ModerationService
        
        moderation_service = ModerationService()
        count = 0
        
        for review in queryset.filter(moderation_status__in=['pending', 'soft_reject']):
            try:
                moderation_service.approve_review(review, request.user, 'Массовое подтверждение')
                count += 1
            except Exception as e:
                self.message_user(request, f'Ошибка при подтверждении отзыва {review.uuid}: {str(e)}', level='ERROR')
        
        self.message_user(request, f'Подтверждено отзывов: {count} из {queryset.count()}')
    
    def soft_reject_selected(self, request, queryset):
        """
        Массовый мягкий отказ
        """
        from gamification.services.moderation_service import ModerationService
        
        moderation_service = ModerationService()
        count = 0
        
        for review in queryset.filter(moderation_status='pending'):
            try:
                moderation_service.soft_reject_review(review, request.user, 'Массовый мягкий отказ')
                count += 1
            except Exception as e:
                self.message_user(request, f'Ошибка при отказе отзыва {review.uuid}: {str(e)}', level='ERROR')
        
        self.message_user(request, f'Отклонено отзывов: {count} из {queryset.count()}')
    
    def spam_block_selected(self, request, queryset):
        """
        Массовая блокировка как спам
        """
        from gamification.services.moderation_service import ModerationService
        
        moderation_service = ModerationService()
        count = 0
        
        for review in queryset.exclude(moderation_status='spam_blocked'):
            try:
                moderation_service.spam_block_review(review, request.user, 'Массовая блокировка как спам')
                count += 1
            except Exception as e:
                self.message_user(request, f'Ошибка при блокировке отзыва {review.uuid}: {str(e)}', level='ERROR')
        
        self.message_user(request, f'Заблокировано отзывов: {count} из {queryset.count()}')
    
    approve_selected.short_description = "Подтвердить выбранные отзывы"
    soft_reject_selected.short_description = "Мягкий отказ для выбранных"
    spam_block_selected.short_description = "Заблокировать как спам"


@admin.register(RewardTransaction)
class RewardTransactionAdmin(admin.ModelAdmin):
    """
    Админ-панель для транзакций наград
    """
    list_display = [
        'uuid', 'user', 'transaction_type', 'amount',
        'reason', 'balance_after', 'created_at'
    ]
    list_filter = ['transaction_type', 'reason', 'created_at']
    search_fields = ['uuid', 'user__username']
    readonly_fields = ['uuid', 'created_at']
    
    fieldsets = (
        ('Транзакция', {
            'fields': ('uuid', 'user', 'transaction_type', 'amount', 'reason')
        }),
        ('Связи', {
            'fields': ('review',)
        }),
        ('Данные', {
            'fields': ('balance_after', 'metadata', 'created_at')
        }),
    )


@admin.register(Reward)
class RewardAdmin(admin.ModelAdmin):
    """
    Админ-панель для наград
    """
    list_display = [
        'name', 'reward_type', 'points_cost',
        'is_available', 'stock_quantity', 'sold_quantity',
        'partner_name', 'created_at'
    ]
    list_filter = ['reward_type', 'is_available', 'created_at']
    search_fields = ['name', 'description', 'partner_name']
    readonly_fields = ['uuid', 'sold_quantity', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('uuid', 'name', 'description', 'reward_type', 'image')
        }),
        ('Стоимость и доступность', {
            'fields': ('points_cost', 'is_available', 'stock_quantity', 'sold_quantity')
        }),
        ('Партнер', {
            'fields': ('partner_name', 'metadata')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(UserReward)
class UserRewardAdmin(admin.ModelAdmin):
    """
    Админ-панель для наград пользователей
    """
    list_display = [
        'user', 'reward', 'status', 'used_at', 'created_at'
    ]
    list_filter = ['status', 'created_at', 'used_at']
    search_fields = ['user__username', 'reward__name']
    readonly_fields = ['uuid', 'created_at']


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    """
    Админ-панель для достижений
    """
    list_display = [
        'name', 'rarity', 'bonus_points', 'bonus_reputation', 'created_at'
    ]
    list_filter = ['rarity', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['uuid', 'created_at']


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    """
    Админ-панель для достижений пользователей
    """
    list_display = [
        'user', 'achievement', 'progress', 'created_at'
    ]
    list_filter = ['achievement__rarity', 'created_at']
    search_fields = ['user__username', 'achievement__name']
    readonly_fields = ['uuid', 'created_at']


@admin.register(ModerationLog)
class ModerationLogAdmin(admin.ModelAdmin):
    """
    Админ-панель для логов модерации
    """
    list_display = [
        'moderator', 'review', 'action', 'processing_time', 'created_at'
    ]
    list_filter = ['action', 'created_at']
    search_fields = ['moderator__username', 'review__uuid', 'comment']
    readonly_fields = ['uuid', 'created_at']

