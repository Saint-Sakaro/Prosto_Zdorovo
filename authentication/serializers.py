"""
Serializers для модуля авторизации

Используются для:
- Регистрации новых пользователей
- Входа в систему (получение JWT токенов)
- Обновления токенов
- Управления профилем пользователя
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from gamification.utils import get_or_create_user_profile


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer для регистрации нового пользователя
    
    Поля:
    - username: Имя пользователя (обязательно, уникально)
    - email: Email (обязательно, уникально)
    - password: Пароль (обязательно, валидируется)
    - password_confirm: Подтверждение пароля (обязательно)
    - first_name: Имя (опционально)
    - last_name: Фамилия (опционально)
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name'
        ]
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': False},
            'last_name': {'required': False},
        }
    
    def validate(self, attrs):
        """
        Валидация данных регистрации
        
        Проверяет:
        - Совпадение паролей
        - Уникальность email
        - Уникальность username
        """
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password': 'Пароли не совпадают',
                'password_confirm': 'Пароли не совпадают'
            })
        
        # Проверка уникальности email
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({
                'email': 'Пользователь с таким email уже существует'
            })
        
        return attrs
    
    def create(self, validated_data):
        """
        Создание нового пользователя
        
        Args:
            validated_data: Валидированные данные
        
        Returns:
            User: Созданный пользователь
        """
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=password,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        
        # Создаем профиль геймификации
        get_or_create_user_profile(user)
        
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Кастомный serializer для получения JWT токенов
    
    Расширяет стандартный TokenObtainPairSerializer для добавления
    дополнительных данных в ответ (например, информация о пользователе)
    """
    
    @classmethod
    def get_token(cls, user):
        """
        Получить токен для пользователя
        
        Args:
            user: Объект User
        
        Returns:
            Token: JWT токен с дополнительными claims
        """
        token = super().get_token(user)
        
        # Добавляем дополнительные данные в токен
        token['user_id'] = user.id
        token['username'] = user.username
        token['email'] = user.email
        
        return token
    
    def validate(self, attrs):
        """
        Валидация данных входа
        
        Args:
            attrs: Данные запроса (username, password)
        
        Returns:
            dict: Данные с токенами и информацией о пользователе
        """
        data = super().validate(attrs)
        
        # Получаем профиль пользователя
        user_profile = get_or_create_user_profile(self.user)
        
        # Проверяем блокировку
        if user_profile.is_banned:
            from django.utils import timezone
            if user_profile.banned_until and user_profile.banned_until > timezone.now():
                raise serializers.ValidationError({
                    'non_field_errors': [
                        f'Ваш аккаунт заблокирован до {user_profile.banned_until.strftime("%d.%m.%Y %H:%M")}'
                    ]
                })
            elif user_profile.banned_until is None:
                raise serializers.ValidationError({
                    'non_field_errors': ['Ваш аккаунт заблокирован. Обратитесь в поддержку.']
                })
        
        # Формируем ответ в формате, который ожидает фронтенд
        # Стандартный TokenObtainPairSerializer возвращает { access, refresh }
        # Нужно преобразовать в { tokens: { access, refresh }, user: {...} }
        access_token = data.pop('access')
        refresh_token = data.pop('refresh')
        
        return {
            'tokens': {
                'access': access_token,
                'refresh': refresh_token,
            },
            'user': {
                'id': self.user.id,
                'username': self.user.username,
                'email': self.user.email,
                'first_name': self.user.first_name,
                'last_name': self.user.last_name,
                'is_staff': self.user.is_staff,
                'is_superuser': self.user.is_superuser,
            }
        }


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer для просмотра и обновления профиля пользователя
    
    Используется для:
    - Просмотра информации о пользователе
    - Обновления данных пользователя
    """
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'date_joined', 'last_login', 'is_staff', 'is_superuser'
        ]
        read_only_fields = ['id', 'username', 'date_joined', 'last_login', 'is_staff', 'is_superuser']
    
    def validate_email(self, value):
        """
        Валидация email при обновлении
        
        Проверяет уникальность email (кроме текущего пользователя)
        """
        user = self.instance
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('Пользователь с таким email уже существует')
        
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer для смены пароля
    
    Поля:
    - old_password: Текущий пароль
    - new_password: Новый пароль
    - new_password_confirm: Подтверждение нового пароля
    """
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """
        Валидация данных смены пароля
        
        Проверяет:
        - Правильность текущего пароля
        - Совпадение нового пароля и подтверждения
        """
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password': 'Пароли не совпадают',
                'new_password_confirm': 'Пароли не совпадают'
            })
        
        return attrs
    
    def validate_old_password(self, value):
        """
        Валидация текущего пароля
        
        Проверяет правильность старого пароля
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Неверный текущий пароль')
        
        return value

