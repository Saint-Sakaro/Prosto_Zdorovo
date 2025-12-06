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

urlpatterns = [
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

