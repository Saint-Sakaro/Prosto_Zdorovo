"""
Главный URL конфигуратор проекта

Подключает маршруты для:
- Админ-панели Django
- API модуля геймификации
- API других модулей (отзывы, пользователи, карта)
- Медиафайлы в режиме разработки
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def api_root(request):
    """Корневой эндпоинт с информацией о доступных API"""
    return JsonResponse({
        'name': 'Карта здоровья API',
        'version': '1.0.0',
        'description': 'API для веб-приложения "Карта здоровья"',
        'endpoints': {
            'admin': '/admin/',
            'authentication': {
                'base_url': '/api/auth/',
                'description': 'Авторизация и регистрация пользователей',
                'endpoints': [
                    '/api/auth/register/ - Регистрация нового пользователя',
                    '/api/auth/login/ - Вход в систему',
                    '/api/auth/logout/ - Выход из системы',
                    '/api/auth/profile/ - Профиль текущего пользователя',
                ]
            },
            'gamification': {
                'base_url': '/api/gamification/',
                'description': 'Модуль геймификации и мотивации',
                'endpoints': [
                    '/api/gamification/profiles/ - Профили пользователей',
                    '/api/gamification/reviews/ - Отзывы и оценки',
                    '/api/gamification/leaderboard/ - Таблицы лидеров',
                    '/api/gamification/rewards/ - Маркетплейс наград',
                    '/api/gamification/achievements/ - Достижения',
                ]
            },
            'maps': {
                'base_url': '/api/maps/',
                'description': 'Модуль карт и анализа областей',
                'endpoints': [
                    '/api/maps/pois/ - Точки интереса (POI)',
                    '/api/maps/categories/ - Категории POI',
                    '/api/maps/analyze/ - Анализ области',
                    '/api/maps/geocode/ - Геокодирование',
                ]
            }
        }
    }, json_dumps_params={'ensure_ascii': False, 'indent': 2})

urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    
    # API маршруты
    path('api/auth/', include('authentication.urls')),  # Авторизация и регистрация
    path('api/gamification/', include('gamification.urls')),  # Модуль геймификации
    path('api/maps/', include('maps.urls')),  # Модуль карт и анализа областей
    # path('api/reviews/', include('reviews.urls')),  # Если модуль отзывов отдельный
]

# Раздача медиафайлов в режиме разработки
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

