# Модуль авторизации и регистрации

## Описание

Модуль авторизации и регистрации для веб-приложения "Карта здоровья". Реализует JWT-аутентификацию, регистрацию пользователей, управление профилем и смену пароля.

## Архитектура

### Компоненты

1. **Serializers** (`serializers.py`):
   - `UserRegistrationSerializer` - регистрация нового пользователя
   - `CustomTokenObtainPairSerializer` - получение JWT токенов с дополнительными данными
   - `UserProfileSerializer` - просмотр и обновление профиля
   - `ChangePasswordSerializer` - смена пароля

2. **Views** (`views.py`):
   - `RegisterView` - регистрация пользователя
   - `CustomTokenObtainPairView` - вход в систему
   - `UserProfileView` - управление профилем
   - `ChangePasswordView` - смена пароля
   - `current_user_view` - информация о текущем пользователе

3. **URLs** (`urls.py`):
   - `POST /api/auth/register/` - регистрация
   - `POST /api/auth/login/` - вход в систему
   - `POST /api/auth/token/refresh/` - обновление токена
   - `GET /api/auth/profile/` - получить профиль
   - `PUT /api/auth/profile/` - обновить профиль
   - `POST /api/auth/change-password/` - сменить пароль
   - `GET /api/auth/me/` - информация о текущем пользователе

4. **Signals** (`signals.py`):
   - Автоматическое создание профиля геймификации при регистрации

## API Эндпоинты

### Регистрация

**POST** `/api/auth/register/`

Request body:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "password_confirm": "string",
  "first_name": "string (optional)",
  "last_name": "string (optional)"
}
```

Response:
```json
{
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "first_name": "string",
    "last_name": "string"
  },
  "tokens": {
    "refresh": "string",
    "access": "string"
  },
  "message": "Пользователь успешно зарегистрирован"
}
```

### Вход в систему

**POST** `/api/auth/login/`

Request body:
```json
{
  "username": "string",
  "password": "string"
}
```

Response:
```json
{
  "refresh": "string",
  "access": "string",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "first_name": "string",
    "last_name": "string"
  }
}
```

### Обновление токена

**POST** `/api/auth/token/refresh/`

Request body:
```json
{
  "refresh": "string"
}
```

Response:
```json
{
  "access": "string"
}
```

### Получение профиля

**GET** `/api/auth/profile/`

Headers:
```
Authorization: Bearer <access_token>
```

Response:
```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "first_name": "string",
  "last_name": "string",
  "date_joined": "2024-01-01T00:00:00Z",
  "last_login": "2024-01-01T00:00:00Z"
}
```

### Обновление профиля

**PUT/PATCH** `/api/auth/profile/`

Headers:
```
Authorization: Bearer <access_token>
```

Request body:
```json
{
  "email": "string",
  "first_name": "string",
  "last_name": "string"
}
```

### Смена пароля

**POST** `/api/auth/change-password/`

Headers:
```
Authorization: Bearer <access_token>
```

Request body:
```json
{
  "old_password": "string",
  "new_password": "string",
  "new_password_confirm": "string"
}
```

### Текущий пользователь

**GET** `/api/auth/me/`

Headers:
```
Authorization: Bearer <access_token>
```

Response:
```json
{
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "first_name": "string",
    "last_name": "string",
    "date_joined": "2024-01-01T00:00:00Z",
    "last_login": "2024-01-01T00:00:00Z"
  },
  "gamification": {
    "total_reputation": 0,
    "monthly_reputation": 0,
    "points_balance": 0,
    "level": 1,
    "unique_reviews_count": 0,
    "is_banned": false
  }
}
```

## Интеграция с модулем геймификации

При регистрации нового пользователя автоматически создается профиль геймификации (`UserProfile`) через сигнал `create_gamification_profile`. Это обеспечивает:

- Автоматическую инициализацию рейтингов и баллов
- Готовность пользователя к участию в геймификации сразу после регистрации

## Безопасность

- Пароли хешируются автоматически через Django
- JWT токены с настраиваемым временем жизни
- Валидация паролей через Django validators
- Проверка блокировки аккаунта при входе
- Обновление сессии при смене пароля

## Настройки JWT

Настройки JWT находятся в `health_map/settings.py`:

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),  # 1 час
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),  # 7 дней
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
}
```

## Статус реализации

✅ **Все функции реализованы и готовы к использованию!**

- ✅ Регистрация пользователей
- ✅ Вход в систему (JWT токены)
- ✅ Обновление токенов
- ✅ Управление профилем
- ✅ Смена пароля
- ✅ Автоматическое создание профиля геймификации
- ✅ Проверка блокировки аккаунта при входе

