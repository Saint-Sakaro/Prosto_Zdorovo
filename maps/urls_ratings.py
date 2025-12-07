"""
URL конфигурация для модуля анкет и рейтингов

Определяет маршруты для:
- Управления схемами анкет
- Заполнения анкет объектов
- Просмотра рейтингов
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from maps import views_ratings

# Создание роутера для ViewSets
router = DefaultRouter()

# Регистрация ViewSets
router.register(r'form-schemas', views_ratings.FormSchemaViewSet, basename='form-schema')
router.register(r'ratings', views_ratings.POIRatingViewSet, basename='poi-rating')

urlpatterns = [
    # Подключение всех маршрутов из роутера
    path('', include(router.urls)),
    
    # Обновление данных анкеты объекта
    path('pois/<uuid:uuid>/form-data/', views_ratings.POIFormDataView.as_view(), name='poi-form-data'),
]

