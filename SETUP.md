# Инструкция по настройке проекта "Карта здоровья"

## Шаг 1: Установка зависимостей

### Вариант A: Использование виртуального окружения (рекомендуется)

```bash
# Создать виртуальное окружение
python3 -m venv venv

# Активировать виртуальное окружение
# На macOS/Linux:
source venv/bin/activate
# На Windows:
# venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt
```

### Вариант B: Установка напрямую

```bash
pip install -r requirements.txt
```

## Шаг 2: Настройка базы данных PostgreSQL

### Установка PostgreSQL (если не установлен)

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Скачайте и установите с официального сайта: https://www.postgresql.org/download/windows/

### Создание базы данных

```bash
# Войти в PostgreSQL
psql -U postgres

# Создать базу данных
CREATE DATABASE health_map;

# Создать пользователя (если нужно)
CREATE USER health_map_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE health_map TO health_map_user;

# Выйти
\q
```

## Шаг 3: Настройка Redis (для Celery)

### Установка Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Windows:**
Скачайте с: https://github.com/microsoftarchive/redis/releases

## Шаг 4: Настройка переменных окружения

```bash
# Скопировать пример файла окружения
cp env.example .env

# Отредактировать .env файл с вашими настройками
nano .env  # или используйте любой текстовый редактор
```

Минимальные настройки в `.env`:
```env
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=health_map
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

## Шаг 5: Создание миграций и применение их

```bash
# Создать миграции для всех приложений
python manage.py makemigrations

# Применить миграции к базе данных
python manage.py migrate

# Создать суперпользователя для доступа к админ-панели
python manage.py createsuperuser
```

## Шаг 6: Запуск сервера разработки

```bash
# Запустить Django сервер
python manage.py runserver

# В другом терминале запустить Celery worker (для фоновых задач)
celery -A health_map worker --loglevel=info

# В третьем терминале запустить Celery beat (для периодических задач)
celery -A health_map beat --loglevel=info
```

## Шаг 7: Проверка работы

### Проверка API

Откройте в браузере:
- Админ-панель: http://127.0.0.1:8000/admin/
- API документация (если настроена): http://127.0.0.1:8000/api/

### Тестирование функций

```bash
# Запустить Django shell
python manage.py shell

# В shell выполнить:
from gamification.test_functions import run_all_tests
run_all_tests()
```

## Дополнительные команды

### Создание тестовых данных

```bash
python manage.py shell
```

В shell:
```python
from django.contrib.auth.models import User
from gamification.models import UserProfile, Review, Reward
from gamification.utils import get_or_create_user_profile

# Создать тестового пользователя
user = User.objects.create_user('testuser', 'test@example.com', 'password123')
profile = get_or_create_user_profile(user)

# Создать тестовую награду
reward = Reward.objects.create(
    name='Тестовая награда',
    description='Описание награды',
    reward_type='digital_merch',
    points_cost=50,
    is_available=True
)
```

### Просмотр логов

```bash
# Логи Django
tail -f logs/django.log  # если настроено логирование

# Логи Celery
tail -f logs/celery.log
```

## Решение проблем

### Ошибка подключения к базе данных

1. Проверьте, что PostgreSQL запущен:
   ```bash
   # macOS/Linux
   pg_isready
   
   # Или проверьте процессы
   ps aux | grep postgres
   ```

2. Проверьте настройки в `.env` файле

3. Проверьте права доступа пользователя к базе данных

### Ошибка подключения к Redis

1. Проверьте, что Redis запущен:
   ```bash
   redis-cli ping
   # Должно вернуть: PONG
   ```

2. Проверьте настройки в `.env` файле

### Ошибки миграций

```bash
# Сбросить миграции (ОСТОРОЖНО: удалит данные!)
python manage.py migrate gamification zero
python manage.py makemigrations gamification
python manage.py migrate
```

## Полезные ссылки

- Django документация: https://docs.djangoproject.com/
- PostgreSQL документация: https://www.postgresql.org/docs/
- Celery документация: https://docs.celeryproject.org/
- Redis документация: https://redis.io/docs/

