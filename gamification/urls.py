"""
URL конфигурация для модуля геймификации

Определяет маршруты для всех API эндпоинтов
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from gamification import views

# Создание роутера для ViewSets
router = DefaultRouter()

# Регистрация ViewSets
router.register(r'profiles', views.UserProfileViewSet, basename='profile')
router.register(r'reviews', views.ReviewViewSet, basename='review')
router.register(r'leaderboard', views.LeaderboardViewSet, basename='leaderboard')
router.register(r'rewards', views.RewardViewSet, basename='reward')
router.register(r'my-rewards', views.UserRewardViewSet, basename='user-reward')
router.register(r'achievements', views.AchievementViewSet, basename='achievement')

urlpatterns = [
    # Подключение всех маршрутов из роутера
    path('', include(router.urls)),
    
    # Дополнительные маршруты (если нужны вне ViewSets)
    # path('some-custom-endpoint/', views.some_view, name='some-view'),
]

