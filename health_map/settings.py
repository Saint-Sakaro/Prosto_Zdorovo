"""
Настройки Django проекта "Карта здоровья"

Содержит конфигурацию:
- Базы данных
- Приложений Django
- REST Framework
- CORS
- Celery для фоновых задач
- Медиафайлы и статика
"""

import os
from pathlib import Path
import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Инициализация переменных окружения
env = environ.Env(
    DEBUG=(bool, False)
)

# Чтение .env файла
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY', default='django-insecure-change-me-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env('DEBUG')

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[])

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    
    # Local apps
    'gamification',  # Модуль геймификации
    'authentication',  # Модуль авторизации и регистрации
    'maps',  # Модуль карт и анализа областей
    # 'reviews',  # Модуль отзывов (если отдельный) - закомментировано, приложение не существует
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # CORS должен быть перед CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'health_map.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'health_map.wsgi.application'

# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases
# Используем SQLite для тестирования, если PostgreSQL недоступен
USE_SQLITE = env.bool('USE_SQLITE', default=True)
if USE_SQLITE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env('DB_NAME', default='health_map'),
            'USER': env('DB_USER', default='postgres'),
            'PASSWORD': env('DB_PASSWORD', default=''),
            'HOST': env('DB_HOST', default='localhost'),
            'PORT': env('DB_PORT', default='5432'),
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = 'Europe/Moscow'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files (загруженные пользователями)
MEDIA_URL = 'media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework настройки
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# JWT настройки
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),  # Время жизни access токена
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),  # Время жизни refresh токена
    'ROTATE_REFRESH_TOKENS': True,  # Обновлять refresh токен при каждом обновлении
    'BLACKLIST_AFTER_ROTATION': True,  # Добавлять старые токены в черный список
    'UPDATE_LAST_LOGIN': True,  # Обновлять last_login при входе
    
    'ALGORITHM': 'HS256',  # Алгоритм подписи
    'SIGNING_KEY': SECRET_KEY,  # Ключ для подписи
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    
    'AUTH_HEADER_TYPES': ('Bearer',),  # Тип заголовка для токена
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',  # Имя заголовка
    'USER_ID_FIELD': 'id',  # Поле для идентификации пользователя
    'USER_ID_CLAIM': 'user_id',  # Claim для user_id в токене
    
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    
    'JTI_CLAIM': 'jti',  # Claim для уникального идентификатора токена
    
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}

# CORS настройки (для React фронтенда)
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Celery Configuration (для фоновых задач)
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Настройки модуля геймификации
GAMIFICATION_CONFIG = {
    # Радиус проверки уникальности в метрах
    'UNIQUENESS_RADIUS_METERS': env.int('UNIQUENESS_RADIUS_METERS', default=50),
    
    # Временное окно проверки уникальности в часах
    'UNIQUENESS_TIME_WINDOW_HOURS': env.int('UNIQUENESS_TIME_WINDOW_HOURS', default=24),
    
    # Коэффициент конвертации баллов в рейтинг при месячном сбросе
    'POINTS_TO_REPUTATION_RATE': env.float('POINTS_TO_REPUTATION_RATE', default=0.1),
    
    # Количество топ пользователей для месячного рейтинга
    'MONTHLY_LEADERBOARD_TOP_N': env.int('MONTHLY_LEADERBOARD_TOP_N', default=10),
    
    # Баллы за подтвержденный уникальный отзыв
    'POINTS_FOR_UNIQUE_REVIEW': env.int('POINTS_FOR_UNIQUE_REVIEW', default=100),
    
    # Баллы за дубликат/подтверждение
    'POINTS_FOR_DUPLICATE': env.int('POINTS_FOR_DUPLICATE', default=10),
    
    # Репутация за подтвержденный уникальный отзыв
    'REPUTATION_FOR_UNIQUE_REVIEW': env.int('REPUTATION_FOR_UNIQUE_REVIEW', default=50),
    
    # Штраф репутации за спам
    'REPUTATION_PENALTY_FOR_SPAM': env.int('REPUTATION_PENALTY_FOR_SPAM', default=20),
    
    # Количество спам-отзывов для блокировки аккаунта
    'SPAM_THRESHOLD_FOR_BAN': env.int('SPAM_THRESHOLD_FOR_BAN', default=5),
}

# Яндекс Geocoder API настройки
YANDEX_GEOCODER_API_KEY = env('YANDEX_GEOCODER_API_KEY', default=None)

# GIGACHAT LLM настройки (для генерации анкет и анализа отзывов)
GIGACHAT_CLIENT_ID = env('GIGACHAT_CLIENT_ID', default=None)
GIGACHAT_CLIENT_SECRET = env('GIGACHAT_CLIENT_SECRET', default=None)
GIGACHAT_SCOPE = env('GIGACHAT_SCOPE', default='GIGACHAT_API_PERS')
GIGACHAT_MODEL = env('GIGACHAT_MODEL', default='GigaChat')

# OpenSearch настройки (для точных геопространственных запросов)
OPENSEARCH_HOST = env('OPENSEARCH_HOST', default='localhost')
OPENSEARCH_PORT = env.int('OPENSEARCH_PORT', default=9200)
OPENSEARCH_USE_SSL = env.bool('OPENSEARCH_USE_SSL', default=False)
OPENSEARCH_VERIFY_CERTS = env.bool('OPENSEARCH_VERIFY_CERTS', default=True)
OPENSEARCH_USERNAME = env('OPENSEARCH_USERNAME', default=None)
OPENSEARCH_PASSWORD = env('OPENSEARCH_PASSWORD', default=None)

# Формируем кортеж для аутентификации если указаны
if OPENSEARCH_USERNAME and OPENSEARCH_PASSWORD:
    OPENSEARCH_AUTH = (OPENSEARCH_USERNAME, OPENSEARCH_PASSWORD)
else:
    OPENSEARCH_AUTH = None

