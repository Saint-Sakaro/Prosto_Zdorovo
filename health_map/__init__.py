# Основной пакет проекта Health Map

# Импорт Celery app для автоматической регистрации задач
from .celery import app as celery_app

__all__ = ('celery_app',)

