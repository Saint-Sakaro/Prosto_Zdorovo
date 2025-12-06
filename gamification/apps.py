"""
Конфигурация приложения Gamification
"""

from django.apps import AppConfig


class GamificationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gamification'
    verbose_name = 'Геймификация'
    
    def ready(self):
        """
        Вызывается при готовности приложения.
        Здесь можно подключить сигналы Django, периодические задачи и т.д.
        """
        # Импорт сигналов для автоматической регистрации
        import gamification.signals
        
        # Импорт задач Celery для регистрации
        import gamification.tasks

