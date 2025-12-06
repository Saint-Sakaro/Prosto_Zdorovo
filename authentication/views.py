"""
Views для модуля авторизации

Реализует эндпоинты для:
- Регистрации пользователей
- Входа в систему (получение JWT токенов)
- Обновления токенов
- Просмотра и обновления профиля
- Смены пароля
"""

from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth.models import User
from django.contrib.auth import update_session_auth_hash

from authentication.serializers import (
    UserRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer
)
from gamification.utils import get_or_create_user_profile


class RegisterView(generics.CreateAPIView):
    """
    View для регистрации нового пользователя
    
    Эндпоинт: POST /api/auth/register/
    
    Body:
        {
            "username": "string",
            "email": "string",
            "password": "string",
            "password_confirm": "string",
            "first_name": "string (optional)",
            "last_name": "string (optional)"
        }
    
    Returns:
        Response с данными пользователя и JWT токенами
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]  # Регистрация доступна всем
    
    def create(self, request, *args, **kwargs):
        """
        Создание нового пользователя
        
        Args:
            request: HTTP запрос
        
        Returns:
            Response с данными пользователя и токенами
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.save()
        
        # Получаем JWT токены для нового пользователя
        token_serializer = CustomTokenObtainPairSerializer()
        refresh = token_serializer.get_token(user)
        
        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
            },
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Пользователь успешно зарегистрирован'
        }, status=status.HTTP_201_CREATED)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    View для получения JWT токенов (вход в систему)
    
    Эндпоинт: POST /api/auth/login/
    
    Body:
        {
            "username": "string",
            "password": "string"
        }
    
    Returns:
        Response с JWT токенами и информацией о пользователе
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]  # Явно разрешаем доступ без авторизации


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    View для просмотра и обновления профиля пользователя
    
    Эндпоинты:
    - GET /api/auth/profile/ - получить профиль текущего пользователя
    - PUT /api/auth/profile/ - обновить профиль текущего пользователя
    - PATCH /api/auth/profile/ - частично обновить профиль
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """
        Получить объект текущего пользователя
        
        Returns:
            User: Текущий пользователь
        """
        return self.request.user


class ChangePasswordView(APIView):
    """
    View для смены пароля
    
    Эндпоинт: POST /api/auth/change-password/
    
    Body:
        {
            "old_password": "string",
            "new_password": "string",
            "new_password_confirm": "string"
        }
    
    Returns:
        Response с сообщением об успехе
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Смена пароля пользователя
        
        Args:
            request: HTTP запрос
        
        Returns:
            Response с сообщением об успехе
        """
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        # Обновляем сессию, чтобы пользователь не разлогинился
        update_session_auth_hash(request, user)
        
        return Response({
            'message': 'Пароль успешно изменен'
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user_view(request):
    """
    Получить информацию о текущем пользователе
    
    Эндпоинт: GET /api/auth/me/
    
    Returns:
        Response с данными пользователя и профиля геймификации
    """
    user = request.user
    user_profile = get_or_create_user_profile(user)
    
    user_data = UserProfileSerializer(user).data
    # Добавляем информацию о правах администратора
    user_data['is_staff'] = user.is_staff
    user_data['is_superuser'] = user.is_superuser
    
    gamification_data = {
        'total_reputation': user_profile.total_reputation,
        'monthly_reputation': user_profile.monthly_reputation,
        'points_balance': user_profile.points_balance,
        'level': user_profile.level,
        'unique_reviews_count': user_profile.unique_reviews_count,
        'is_banned': user_profile.is_banned,
    }
    
    return Response({
        'user': user_data,
        'gamification': gamification_data
    })

