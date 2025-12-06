"""
Конфигурация Celery для фоновых задач

Используется для:
- Ежемесячного сброса показателей
- Отправки уведомлений
- Асинхронной обработки модерации
- Периодических задач
"""

import os
from celery import Celery

# Установка переменной окружения для настроек Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'health_map.settings')

app = Celery('health_map')

# Загрузка настроек из Django settings с префиксом CELERY
app.config_from_object('django.conf:settings', namespace='CELERY')

# Автоматическое обнаружение задач из всех установленных приложений
app.autodiscover_tasks()

# Периодические задачи (для ежемесячного сброса)
from celery.schedules import crontab

app.conf.beat_schedule = {
    'monthly-reset': {
        'task': 'gamification.tasks.monthly_reset',
        'schedule': crontab(hour=0, minute=0, day_of_month=1),  # Первого числа каждого месяца в полночь
    },
    'recalculate-levels': {
        'task': 'gamification.tasks.recalculate_user_levels',
        'schedule': crontab(hour=2, minute=0),  # Каждый день в 2:00
    },
    'cleanup-old-transactions': {
        'task': 'gamification.tasks.cleanup_old_transactions',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),  # Каждое воскресенье в 3:00
    },
}

