# Основной пакет проекта Health Map

# Импорт Celery app для автоматической регистрации задач (опционально)
try:
    from .celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError:
    # Celery не установлен или недоступен - проект может работать без него
    celery_app = None
    __all__ = ()

