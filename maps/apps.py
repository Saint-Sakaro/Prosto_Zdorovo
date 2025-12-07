"""
Конфигурация приложения Maps
"""

from django.apps import AppConfig


class MapsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'maps'
    verbose_name = 'Карты и анализ областей'
    
    def ready(self):
        """
        Вызывается при готовности приложения.
        Здесь можно подключить сигналы Django.
        """
        # Импорт сигналов
        import maps.signals
        # Импорт сигналов для рейтингов
        import maps.signals_ratings

