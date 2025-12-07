"""
Модели данных для модуля геймификации

Содержит модели:
- UserProfile: Расширенный профиль пользователя с рейтингами и баллами
- Review: Отзывы (POI и инциденты) с метаданными для геймификации
- RewardTransaction: История транзакций начисления/списания баллов
- Reward: Каталог наград в маркетплейсе
- UserReward: Связь пользователя с полученными наградами
- Achievement: Достижения пользователей
- UserAchievement: Связь пользователя с достижениями
- ModerationLog: Лог действий модераторов
"""

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class UserProfile(models.Model):
    """
    Расширенный профиль пользователя для геймификации
    
    Хранит:
    - Общий рейтинг (Reputation) - накопительный, не обнуляется
    - Месячный рейтинг (Monthly Reputation) - обнуляется каждый месяц
    - Баллы (Points) - виртуальная валюта
    - Уровень пользователя
    - UUID для идентификации
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='gamification_profile',
        verbose_name='Пользователь'
    )
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    # Общий рейтинг (Reputation) - накопительный показатель авторитета
    total_reputation = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Общий рейтинг'
    )
    
    # Месячный рейтинг - обнуляется первого числа каждого месяца
    monthly_reputation = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Месячный рейтинг'
    )
    
    # Баллы - виртуальная валюта для покупки наград
    points_balance = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Баланс баллов'
    )
    
    # Уровень пользователя (вычисляется на основе рейтинга и активности)
    level = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name='Уровень'
    )
    
    # Опыт до следующего уровня
    experience = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Опыт'
    )
    
    # Количество подтвержденных уникальных отзывов
    unique_reviews_count = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Количество уникальных отзывов'
    )
    
    # Количество спам-отзывов (для автоматической блокировки)
    spam_count = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Количество спам-отзывов'
    )
    
    # Флаг блокировки аккаунта
    is_banned = models.BooleanField(
        default=False,
        verbose_name='Заблокирован'
    )
    
    # Дата блокировки (если заблокирован)
    banned_until = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Заблокирован до'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    class Meta:
        verbose_name = 'Профиль геймификации'
        verbose_name_plural = 'Профили геймификации'
        ordering = ['-total_reputation']  # По умолчанию сортировка по рейтингу
    
    def __str__(self):
        return f"{self.user.username} - Rep: {self.total_reputation}, Points: {self.points_balance}"


class Review(models.Model):
    """
    Модель отзыва/инцидента с метаданными для геймификации
    
    Типы отзывов:
    - POI_REVIEW: Отзыв о статическом объекте (ресторан, магазин, спортзал и т.д.)
    - INCIDENT: Динамическая точка инцидента (мусор, яма, неполадка и т.д.)
    
    Статусы модерации:
    - PENDING: Ожидает проверки модератором
    - APPROVED: Подтвержден, награды начислены
    - SOFT_REJECT: Неактуален или недостаточно подтвержден
    - SPAM_BLOCKED: Признан спамом или фейком
    """
    
    REVIEW_TYPE_CHOICES = [
        ('poi_review', 'Отзыв о POI'),
        ('incident', 'Инцидент'),
    ]
    
    MODERATION_STATUS_CHOICES = [
        ('pending', 'Ожидает модерации'),
        ('approved', 'Подтвержден'),
        ('soft_reject', 'Неактуален'),
        ('spam_blocked', 'Спам'),
    ]
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    # Связь с пользователем (может быть ForeignKey на User или на отдельную модель Review)
    # Предполагаем, что есть отдельная модель Review в модуле reviews
    # Здесь используем GenericForeignKey или ForeignKey на User для примера
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='gamification_reviews',
        verbose_name='Автор'
    )
    
    # Тип отзыва
    review_type = models.CharField(
        max_length=20,
        choices=REVIEW_TYPE_CHOICES,
        verbose_name='Тип отзыва'
    )
    
    # Географические координаты
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name='Широта'
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name='Долгота'
    )
    
    # Категория отзыва (спорт, питание, медицина, инцидент и т.д.)
    category = models.CharField(
        max_length=100,
        verbose_name='Категория'
    )
    
    # Текстовое содержание отзыва
    content = models.TextField(
        verbose_name='Содержание'
    )
    
    # Флаг наличия медиа-доказательств (фото/видео)
    has_media = models.BooleanField(
        default=False,
        verbose_name='Есть медиа'
    )
    
    # Признак уникальности (устанавливается после проверки на дубли)
    is_unique = models.BooleanField(
        default=False,
        verbose_name='Уникальный'
    )
    
    # Статус модерации
    moderation_status = models.CharField(
        max_length=20,
        choices=MODERATION_STATUS_CHOICES,
        default='pending',
        verbose_name='Статус модерации'
    )
    
    # Модератор, который проверил отзыв
    moderated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='moderated_reviews',
        verbose_name='Модератор'
    )
    
    # Дата модерации
    moderated_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата модерации'
    )
    
    # Комментарий модератора
    moderation_comment = models.TextField(
        blank=True,
        verbose_name='Комментарий модератора'
    )
    
    # Оценка отзыва (1-5)
    rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name='Оценка (1-5)'
    )
    
    # Прямая связь с POI (опционально, для оптимизации)
    poi = models.ForeignKey(
        'maps.POI',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviews',
        verbose_name='Объект POI'
    )
    
    # Результаты LLM анализа
    sentiment_score = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(-1.0), MaxValueValidator(1.0)],
        verbose_name='Сентимент (LLM)'
    )
    
    extracted_facts = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Извлеченные факты (LLM)'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    class Meta:
        verbose_name = 'Отзыв'
        verbose_name_plural = 'Отзывы'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['latitude', 'longitude', 'created_at']),  # Для поиска по радиусу
            models.Index(fields=['moderation_status', 'created_at']),  # Для модерации
            models.Index(fields=['author', 'created_at']),  # Для истории пользователя
        ]
    
    def __str__(self):
        return f"{self.get_review_type_display()} от {self.author.username} - {self.moderation_status}"


class RewardTransaction(models.Model):
    """
    История транзакций начисления и списания баллов
    
    Позволяет отслеживать:
    - Историю всех операций с баллами
    - Причины начисления/списания
    - Отчеты и аналитику
    """
    
    TRANSACTION_TYPE_CHOICES = [
        ('credit', 'Начисление'),
        ('debit', 'Списание'),
    ]
    
    REASON_CHOICES = [
        # Начисления
        ('unique_review_approved', 'Подтвержден уникальный отзыв'),
        ('duplicate_review', 'Дубликат/подтверждение отзыва'),
        ('incident_reported', 'Зафиксирован инцидент'),
        ('media_attached', 'Прикреплено медиа'),
        ('monthly_bonus', 'Месячный бонус'),
        ('seasonal_activity', 'Сезонная активность'),
        ('achievement_bonus', 'Бонус за достижение'),
        # Списания
        ('reward_purchase', 'Покупка награды'),
        ('monthly_conversion', 'Конвертация в рейтинг'),
        ('monthly_reset', 'Месячный сброс'),
        ('spam_penalty', 'Штраф за спам'),
    ]
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reward_transactions',
        verbose_name='Пользователь'
    )
    
    # Тип транзакции
    transaction_type = models.CharField(
        max_length=10,
        choices=TRANSACTION_TYPE_CHOICES,
        verbose_name='Тип транзакции'
    )
    
    # Количество баллов
    amount = models.IntegerField(
        validators=[MinValueValidator(1)],
        verbose_name='Количество баллов'
    )
    
    # Причина транзакции
    reason = models.CharField(
        max_length=50,
        choices=REASON_CHOICES,
        verbose_name='Причина'
    )
    
    # Связь с отзывом (если транзакция связана с отзывом)
    review = models.ForeignKey(
        Review,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions',
        verbose_name='Отзыв'
    )
    
    # Баланс после транзакции (для истории)
    balance_after = models.IntegerField(
        verbose_name='Баланс после транзакции'
    )
    
    # Дополнительные метаданные (JSON)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Метаданные'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    
    class Meta:
        verbose_name = 'Транзакция наград'
        verbose_name_plural = 'Транзакции наград'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['reason', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_transaction_type_display()} {self.amount} баллов для {self.user.username} - {self.get_reason_display()}"


class Reward(models.Model):
    """
    Каталог наград в маркетплейсе
    
    Типы наград:
    - COUPON: Скидочный купон
    - DIGITAL_MERCH: Цифровой мерч (значки, рамки, статусы)
    - PHYSICAL_MERCH: Реальный мерч (сувениры, призы)
    - PRIVILEGE: Специальные привилегии
    """
    
    REWARD_TYPE_CHOICES = [
        ('coupon', 'Скидочный купон'),
        ('digital_merch', 'Цифровой мерч'),
        ('physical_merch', 'Реальный мерч'),
        ('privilege', 'Привилегия'),
    ]
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    # Название награды
    name = models.CharField(
        max_length=200,
        verbose_name='Название'
    )
    
    # Описание
    description = models.TextField(
        verbose_name='Описание'
    )
    
    # Тип награды
    reward_type = models.CharField(
        max_length=20,
        choices=REWARD_TYPE_CHOICES,
        verbose_name='Тип награды'
    )
    
    # Цена в баллах
    points_cost = models.IntegerField(
        validators=[MinValueValidator(1)],
        verbose_name='Стоимость в баллах'
    )
    
    # Изображение награды
    image = models.ImageField(
        upload_to='rewards/',
        null=True,
        blank=True,
        verbose_name='Изображение'
    )
    
    # Доступность награды
    is_available = models.BooleanField(
        default=True,
        verbose_name='Доступна'
    )
    
    # Количество доступных единиц (None = неограниченно)
    stock_quantity = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Количество в наличии'
    )
    
    # Количество проданных единиц
    sold_quantity = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Продано'
    )
    
    # Партнер (если награда от партнера)
    partner_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='Партнер'
    )
    
    # Дополнительные данные (код купона, ссылка и т.д.)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Метаданные'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    class Meta:
        verbose_name = 'Награда'
        verbose_name_plural = 'Награды'
        ordering = ['points_cost', 'name']
    
    def __str__(self):
        return f"{self.name} - {self.points_cost} баллов"


class UserReward(models.Model):
    """
    Связь пользователя с полученными наградами
    
    Хранит информацию о том, какие награды получил пользователь
    и когда они были получены
    """
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_rewards',
        verbose_name='Пользователь'
    )
    
    reward = models.ForeignKey(
        Reward,
        on_delete=models.CASCADE,
        related_name='user_rewards',
        verbose_name='Награда'
    )
    
    # Транзакция, через которую была получена награда
    transaction = models.ForeignKey(
        RewardTransaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_rewards',
        verbose_name='Транзакция'
    )
    
    # Статус награды (получена, использована, истекла)
    STATUS_CHOICES = [
        ('active', 'Активна'),
        ('used', 'Использована'),
        ('expired', 'Истекла'),
    ]
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name='Статус'
    )
    
    # Дата использования (если использована)
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата использования'
    )
    
    # Дополнительные данные (код купона, ссылка активации и т.д.)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Метаданные'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата получения'
    )
    
    class Meta:
        verbose_name = 'Награда пользователя'
        verbose_name_plural = 'Награды пользователей'
        ordering = ['-created_at']
        unique_together = [['user', 'reward', 'transaction']]  # Один пользователь не может получить одну награду дважды через одну транзакцию
    
    def __str__(self):
        return f"{self.user.username} - {self.reward.name} ({self.status})"


class Achievement(models.Model):
    """
    Достижения пользователей
    
    Система достижений для мотивации пользователей
    """
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    # Название достижения
    name = models.CharField(
        max_length=200,
        verbose_name='Название'
    )
    
    # Описание
    description = models.TextField(
        verbose_name='Описание'
    )
    
    # Иконка достижения
    icon = models.ImageField(
        upload_to='achievements/',
        null=True,
        blank=True,
        verbose_name='Иконка'
    )
    
    # Условие получения (описание в текстовом виде или JSON с правилами)
    condition = models.TextField(
        verbose_name='Условие получения'
    )
    
    # Бонусные баллы за получение достижения
    bonus_points = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Бонусные баллы'
    )
    
    # Бонусная репутация
    bonus_reputation = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Бонусная репутация'
    )
    
    # Редкость достижения
    RARITY_CHOICES = [
        ('common', 'Обычное'),
        ('rare', 'Редкое'),
        ('epic', 'Эпическое'),
        ('legendary', 'Легендарное'),
    ]
    
    rarity = models.CharField(
        max_length=20,
        choices=RARITY_CHOICES,
        default='common',
        verbose_name='Редкость'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    
    class Meta:
        verbose_name = 'Достижение'
        verbose_name_plural = 'Достижения'
        ordering = ['rarity', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_rarity_display()})"


class UserAchievement(models.Model):
    """
    Связь пользователя с полученными достижениями
    """
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_achievements',
        verbose_name='Пользователь'
    )
    
    achievement = models.ForeignKey(
        Achievement,
        on_delete=models.CASCADE,
        related_name='user_achievements',
        verbose_name='Достижение'
    )
    
    # Прогресс выполнения (если достижение многоуровневое)
    progress = models.IntegerField(
        default=100,
        validators=[MinValueValidator(0)],
        verbose_name='Прогресс (%)'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата получения'
    )
    
    class Meta:
        verbose_name = 'Достижение пользователя'
        verbose_name_plural = 'Достижения пользователей'
        ordering = ['-created_at']
        unique_together = [['user', 'achievement']]  # Одно достижение можно получить один раз
    
    def __str__(self):
        return f"{self.user.username} - {self.achievement.name}"


class ModerationLog(models.Model):
    """
    Лог действий модераторов
    
    Для аудита и анализа работы модерации
    """
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    moderator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='moderation_logs',
        verbose_name='Модератор'
    )
    
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name='moderation_logs',
        verbose_name='Отзыв'
    )
    
    # Действие модератора
    ACTION_CHOICES = [
        ('approved', 'Подтвержден'),
        ('soft_rejected', 'Мягкий отказ'),
        ('spam_blocked', 'Заблокирован как спам'),
    ]
    
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        verbose_name='Действие'
    )
    
    # Комментарий модератора
    comment = models.TextField(
        blank=True,
        verbose_name='Комментарий'
    )
    
    # Время обработки (в секундах)
    processing_time = models.FloatField(
        null=True,
        blank=True,
        verbose_name='Время обработки (сек)'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    
    class Meta:
        verbose_name = 'Лог модерации'
        verbose_name_plural = 'Логи модерации'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.moderator.username if self.moderator else 'System'} - {self.get_action_display()} - {self.review.uuid}"

