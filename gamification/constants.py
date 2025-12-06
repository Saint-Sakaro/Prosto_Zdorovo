"""
Константы для модуля геймификации

Содержит константы, используемые в различных частях модуля:
- Типы отзывов
- Статусы модерации
- Типы транзакций
- Типы наград
- И другие константы
"""

# Типы отзывов
REVIEW_TYPE_POI = 'poi_review'
REVIEW_TYPE_INCIDENT = 'incident'

REVIEW_TYPE_CHOICES = [
    (REVIEW_TYPE_POI, 'Отзыв о POI'),
    (REVIEW_TYPE_INCIDENT, 'Инцидент'),
]

# Статусы модерации
MODERATION_STATUS_PENDING = 'pending'
MODERATION_STATUS_APPROVED = 'approved'
MODERATION_STATUS_SOFT_REJECT = 'soft_reject'
MODERATION_STATUS_SPAM_BLOCKED = 'spam_blocked'

MODERATION_STATUS_CHOICES = [
    (MODERATION_STATUS_PENDING, 'Ожидает модерации'),
    (MODERATION_STATUS_APPROVED, 'Подтвержден'),
    (MODERATION_STATUS_SOFT_REJECT, 'Неактуален'),
    (MODERATION_STATUS_SPAM_BLOCKED, 'Спам'),
]

# Типы транзакций
TRANSACTION_TYPE_CREDIT = 'credit'
TRANSACTION_TYPE_DEBIT = 'debit'

TRANSACTION_TYPE_CHOICES = [
    (TRANSACTION_TYPE_CREDIT, 'Начисление'),
    (TRANSACTION_TYPE_DEBIT, 'Списание'),
]

# Причины транзакций (начисления)
REASON_UNIQUE_REVIEW_APPROVED = 'unique_review_approved'
REASON_DUPLICATE_REVIEW = 'duplicate_review'
REASON_INCIDENT_REPORTED = 'incident_reported'
REASON_MEDIA_ATTACHED = 'media_attached'
REASON_MONTHLY_BONUS = 'monthly_bonus'
REASON_SEASONAL_ACTIVITY = 'seasonal_activity'

# Причины транзакций (списания)
REASON_REWARD_PURCHASE = 'reward_purchase'
REASON_MONTHLY_CONVERSION = 'monthly_conversion'
REASON_MONTHLY_RESET = 'monthly_reset'

REASON_CHOICES = [
    # Начисления
    (REASON_UNIQUE_REVIEW_APPROVED, 'Подтвержден уникальный отзыв'),
    (REASON_DUPLICATE_REVIEW, 'Дубликат/подтверждение отзыва'),
    (REASON_INCIDENT_REPORTED, 'Зафиксирован инцидент'),
    (REASON_MEDIA_ATTACHED, 'Прикреплено медиа'),
    (REASON_MONTHLY_BONUS, 'Месячный бонус'),
    (REASON_SEASONAL_ACTIVITY, 'Сезонная активность'),
    # Списания
    (REASON_REWARD_PURCHASE, 'Покупка награды'),
    (REASON_MONTHLY_CONVERSION, 'Конвертация в рейтинг'),
    (REASON_MONTHLY_RESET, 'Месячный сброс'),
]

# Типы наград
REWARD_TYPE_COUPON = 'coupon'
REWARD_TYPE_DIGITAL_MERCH = 'digital_merch'
REWARD_TYPE_PHYSICAL_MERCH = 'physical_merch'
REWARD_TYPE_PRIVILEGE = 'privilege'

REWARD_TYPE_CHOICES = [
    (REWARD_TYPE_COUPON, 'Скидочный купон'),
    (REWARD_TYPE_DIGITAL_MERCH, 'Цифровой мерч'),
    (REWARD_TYPE_PHYSICAL_MERCH, 'Реальный мерч'),
    (REWARD_TYPE_PRIVILEGE, 'Привилегия'),
]

# Статусы наград пользователя
USER_REWARD_STATUS_ACTIVE = 'active'
USER_REWARD_STATUS_USED = 'used'
USER_REWARD_STATUS_EXPIRED = 'expired'

USER_REWARD_STATUS_CHOICES = [
    (USER_REWARD_STATUS_ACTIVE, 'Активна'),
    (USER_REWARD_STATUS_USED, 'Использована'),
    (USER_REWARD_STATUS_EXPIRED, 'Истекла'),
]

# Редкость достижений
ACHIEVEMENT_RARITY_COMMON = 'common'
ACHIEVEMENT_RARITY_RARE = 'rare'
ACHIEVEMENT_RARITY_EPIC = 'epic'
ACHIEVEMENT_RARITY_LEGENDARY = 'legendary'

ACHIEVEMENT_RARITY_CHOICES = [
    (ACHIEVEMENT_RARITY_COMMON, 'Обычное'),
    (ACHIEVEMENT_RARITY_RARE, 'Редкое'),
    (ACHIEVEMENT_RARITY_EPIC, 'Эпическое'),
    (ACHIEVEMENT_RARITY_LEGENDARY, 'Легендарное'),
]

# Действия модератора
MODERATION_ACTION_APPROVE = 'approve'
MODERATION_ACTION_SOFT_REJECT = 'soft_reject'
MODERATION_ACTION_SPAM_BLOCK = 'spam_block'

MODERATION_ACTION_CHOICES = [
    (MODERATION_ACTION_APPROVE, 'Подтвердить'),
    (MODERATION_ACTION_SOFT_REJECT, 'Мягкий отказ'),
    (MODERATION_ACTION_SPAM_BLOCK, 'Заблокировать как спам'),
]

# Значения по умолчанию (могут быть переопределены в settings.py)
DEFAULT_UNIQUENESS_RADIUS_METERS = 50
DEFAULT_UNIQUENESS_TIME_WINDOW_HOURS = 24
DEFAULT_POINTS_TO_REPUTATION_RATE = 0.1
DEFAULT_MONTHLY_LEADERBOARD_TOP_N = 10
DEFAULT_POINTS_FOR_UNIQUE_REVIEW = 100
DEFAULT_POINTS_FOR_DUPLICATE = 10
DEFAULT_REPUTATION_FOR_UNIQUE_REVIEW = 50
DEFAULT_REPUTATION_PENALTY_FOR_SPAM = 20
DEFAULT_SPAM_THRESHOLD_FOR_BAN = 5

