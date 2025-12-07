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
# submissions регистрируем отдельно, чтобы избежать конфликта с pois/{uuid}/
router.register(r'submissions', views.POISubmissionViewSet, basename='poi-submission')

urlpatterns = [
    # Алиас для совместимости с фронтендом - создание заявки
    # Должен быть ПЕРЕД router.urls, чтобы не конфликтовать с /pois/{uuid}/
    path('pois/submit/', views.POISubmitView.as_view(), name='poi-submit'),
    
    # Массовая загрузка POI (тоже должен быть перед router)
    path('pois/bulk-upload/', views.BulkUploadPOIView.as_view(), name='bulk-upload-poi'),
    
    # Явные пути для submissions (для совместимости с фронтендом)
    # Должны быть перед router, чтобы не конфликтовать с /pois/{uuid}/
    # ВАЖНО: pending должен быть ПЕРЕД <uuid:uuid>, иначе Django будет интерпретировать "pending" как UUID
    path('pois/submissions/pending/', views.POISubmissionViewSet.as_view({'get': 'pending'}), name='poi-submissions-pending'),
    path('pois/submissions/<uuid:uuid>/moderate/', views.POISubmissionViewSet.as_view({'post': 'moderate'}), name='poi-submissions-moderate'),
    path('pois/submissions/<uuid:uuid>/', views.POISubmissionViewSet.as_view({'get': 'retrieve'}), name='poi-submissions-detail'),
    path('pois/submissions/', views.POISubmissionViewSet.as_view({'get': 'list', 'post': 'create'}), name='poi-submissions-list'),
    
    # Подключение всех маршрутов из роутера
    path('', include(router.urls)),
    
    # Анализ области (отдельный эндпоинт)
    path('analyze/', views.AreaAnalysisView.as_view(), name='area-analysis'),
    
    # Геокодирование
    path('geocode/', views.GeocoderView.as_view(), name='geocode'),
    path('reverse-geocode/', views.ReverseGeocoderView.as_view(), name='reverse-geocode'),
    
    # Анкеты и рейтинги
    path('ratings/', include('maps.urls_ratings')),
]

