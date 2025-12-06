"""
URL конфигурация для модуля авторизации

Определяет маршруты для:
- Регистрации
- Входа в систему
- Обновления токенов
- Управления профилем
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from authentication import views

urlpatterns = [
    # Регистрация
    path('register/', views.RegisterView.as_view(), name='register'),
    
    # Вход в систему (получение токенов)
    path('login/', views.CustomTokenObtainPairView.as_view(), name='login'),
    
    # Обновление токена
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Профиль пользователя
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    
    # Смена пароля
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    
    # Текущий пользователь
    path('me/', views.current_user_view, name='current_user'),
]

