"""
URL конфигурация для модуля карт

Определяет маршруты для всех API эндпоинтов
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from maps import views

# Создание роутера для ViewSets
router = DefaultRouter()

# Регистрация ViewSets
router.register(r'pois', views.POIViewSet, basename='poi')
router.register(r'categories', views.POICategoryViewSet, basename='poi-category')
router.register(r'pois/submissions', views.POISubmissionViewSet, basename='poi-submission')
# Алиас для совместимости с фронтендом
router.register(r'pois/submit', views.POISubmissionViewSet, basename='poi-submit')

urlpatterns = [
    # Подключение всех маршрутов из роутера
    path('', include(router.urls)),
    
    # Анализ области (отдельный эндпоинт)
    path('analyze/', views.AreaAnalysisView.as_view(), name='area-analysis'),
    
    # Геокодирование
    path('geocode/', views.GeocoderView.as_view(), name='geocode'),
    path('reverse-geocode/', views.ReverseGeocoderView.as_view(), name='reverse-geocode'),
    
    # Массовая загрузка POI
    path('pois/bulk-upload/', views.BulkUploadPOIView.as_view(), name='bulk-upload-poi'),
    
    # Анкеты и рейтинги
    path('ratings/', include('maps.urls_ratings')),
]

