"""
Конфигурация приложения Authentication
"""

from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'authentication'
    verbose_name = 'Авторизация'
    
    def ready(self):
        """
        Вызывается при готовности приложения.
        Здесь можно подключить сигналы Django.
        """
        # Импорт сигналов (если будут использоваться)
        import authentication.signals

