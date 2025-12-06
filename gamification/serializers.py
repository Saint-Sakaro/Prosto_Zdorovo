"""
Serializers для REST API модуля геймификации

Используются для сериализации/десериализации данных в JSON
для взаимодействия с React фронтендом
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from gamification.models import (
    UserProfile, Review, RewardTransaction, Reward, UserReward,
    Achievement, UserAchievement, ModerationLog
)


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer для профиля пользователя
    
    Используется для:
    - Отображения профиля пользователя
    - Просмотра рейтингов и баллов
    """
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'uuid', 'username', 'email',
            'total_reputation', 'monthly_reputation', 'points_balance',
            'level', 'experience', 'unique_reviews_count',
            'is_banned', 'banned_until',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'uuid', 'total_reputation', 'monthly_reputation',
            'level', 'experience', 'unique_reviews_count',
            'created_at', 'updated_at',
        ]


class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer для отзывов
    
    Используется для:
    - Создания новых отзывов
    - Просмотра отзывов
    - Модерации отзывов
    """
    author_username = serializers.CharField(source='author.username', read_only=True)
    moderated_by_username = serializers.CharField(
        source='moderated_by.username',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = Review
        fields = [
            'uuid', 'author', 'author_username',
            'review_type', 'latitude', 'longitude', 'category',
            'content', 'has_media', 'is_unique',
            'moderation_status', 'moderated_by', 'moderated_by_username',
            'moderated_at', 'moderation_comment',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'uuid', 'author', 'is_unique', 'moderation_status',
            'moderated_by', 'moderated_at', 'moderation_comment',
            'created_at', 'updated_at',
        ]


class ReviewCreateSerializer(serializers.ModelSerializer):
    """
    Serializer для создания нового отзыва
    
    Отдельный serializer для создания, так как:
    - author устанавливается автоматически из request.user
    - Проверка уникальности выполняется при создании
    """
    
    class Meta:
        model = Review
        fields = [
            'review_type', 'latitude', 'longitude', 'category',
            'content', 'has_media',
        ]


class ReviewModerationSerializer(serializers.Serializer):
    """
    Serializer для действий модератора
    
    Используется для:
    - Подтверждения отзыва
    - Мягкого отказа
    - Блокировки как спам
    """
    action = serializers.ChoiceField(
        choices=['approve', 'soft_reject', 'spam_block'],
        required=True
    )
    comment = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000
    )


class RewardTransactionSerializer(serializers.ModelSerializer):
    """
    Serializer для транзакций наград
    
    Используется для:
    - Просмотра истории транзакций пользователя
    """
    user_username = serializers.CharField(source='user.username', read_only=True)
    review_uuid = serializers.UUIDField(source='review.uuid', read_only=True, allow_null=True)
    
    class Meta:
        model = RewardTransaction
        fields = [
            'uuid', 'user', 'user_username',
            'transaction_type', 'amount', 'reason',
            'review', 'review_uuid', 'balance_after',
            'metadata', 'created_at',
        ]
        read_only_fields = [
            'uuid', 'user', 'transaction_type', 'amount',
            'reason', 'balance_after', 'created_at',
        ]


class RewardSerializer(serializers.ModelSerializer):
    """
    Serializer для наград в маркетплейсе
    
    Используется для:
    - Просмотра каталога наград
    - Покупки наград
    """
    
    class Meta:
        model = Reward
        fields = [
            'uuid', 'name', 'description', 'reward_type',
            'points_cost', 'image', 'is_available',
            'stock_quantity', 'sold_quantity', 'partner_name',
            'metadata', 'created_at',
        ]
        read_only_fields = [
            'uuid', 'sold_quantity', 'created_at',
        ]


class UserRewardSerializer(serializers.ModelSerializer):
    """
    Serializer для наград пользователя
    
    Используется для:
    - Просмотра полученных наград
    - Отметки использования награды
    """
    user_username = serializers.CharField(source='user.username', read_only=True)
    reward_name = serializers.CharField(source='reward.name', read_only=True)
    reward_image = serializers.ImageField(source='reward.image', read_only=True)
    
    class Meta:
        model = UserReward
        fields = [
            'uuid', 'user', 'user_username',
            'reward', 'reward_name', 'reward_image',
            'status', 'used_at', 'metadata',
            'created_at',
        ]
        read_only_fields = [
            'uuid', 'user', 'reward', 'created_at',
        ]


class AchievementSerializer(serializers.ModelSerializer):
    """
    Serializer для достижений
    
    Используется для:
    - Просмотра каталога достижений
    """
    
    class Meta:
        model = Achievement
        fields = [
            'uuid', 'name', 'description', 'icon',
            'condition', 'bonus_points', 'bonus_reputation',
            'rarity', 'created_at',
        ]
        read_only_fields = ['uuid', 'created_at']


class UserAchievementSerializer(serializers.ModelSerializer):
    """
    Serializer для достижений пользователя
    
    Используется для:
    - Просмотра полученных достижений
    """
    user_username = serializers.CharField(source='user.username', read_only=True)
    achievement_name = serializers.CharField(source='achievement.name', read_only=True)
    achievement_icon = serializers.ImageField(source='achievement.icon', read_only=True)
    achievement_rarity = serializers.CharField(source='achievement.rarity', read_only=True)
    
    class Meta:
        model = UserAchievement
        fields = [
            'uuid', 'user', 'user_username',
            'achievement', 'achievement_name', 'achievement_icon', 'achievement_rarity',
            'progress', 'created_at',
        ]
        read_only_fields = [
            'uuid', 'user', 'achievement', 'created_at',
        ]


class LeaderboardEntrySerializer(serializers.Serializer):
    """
    Serializer для записей в таблице лидеров
    
    Используется для:
    - Глобальной таблицы лидеров
    - Месячной таблицы лидеров
    """
    rank = serializers.IntegerField()
    user_uuid = serializers.UUIDField()
    username = serializers.CharField()
    total_reputation = serializers.IntegerField()
    monthly_reputation = serializers.IntegerField()
    level = serializers.IntegerField()
    unique_reviews_count = serializers.IntegerField()
    avatar_url = serializers.URLField(required=False, allow_null=True)


class ModerationLogSerializer(serializers.ModelSerializer):
    """
    Serializer для логов модерации
    
    Используется для:
    - Просмотра истории модерации
    - Аудита действий модераторов
    """
    moderator_username = serializers.CharField(
        source='moderator.username',
        read_only=True,
        allow_null=True
    )
    review_uuid = serializers.UUIDField(source='review.uuid', read_only=True)
    
    class Meta:
        model = ModerationLog
        fields = [
            'uuid', 'moderator', 'moderator_username',
            'review', 'review_uuid', 'action',
            'comment', 'processing_time', 'created_at',
        ]
        read_only_fields = [
            'uuid', 'moderator', 'review', 'action',
            'processing_time', 'created_at',
        ]

