# Быстрый старт

## Минимальная настройка за 5 минут

### 1. Установка зависимостей

```bash
# Создать виртуальное окружение (опционально, но рекомендуется)
python3 -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt
```

### 2. Настройка базы данных

**Вариант A: Использовать SQLite (для быстрого тестирования)**

Измените в `health_map/settings.py`:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

**Вариант B: Использовать PostgreSQL (рекомендуется для production)**

1. Установите PostgreSQL
2. Создайте базу данных:
```bash
createdb health_map
```

3. Создайте файл `.env`:
```bash
cp env.example .env
```

4. Отредактируйте `.env` с настройками БД

### 3. Применение миграций

```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Создание суперпользователя

```bash
python manage.py createsuperuser
```

### 5. Запуск сервера

```bash
python manage.py runserver
```

Откройте в браузере: http://127.0.0.1:8000/admin/

## Проверка настройки

```bash
python check_setup.py
```

## Тестирование функций

```bash
python manage.py shell
```

В shell:
```python
from gamification.test_functions import run_all_tests
run_all_tests()
```

## Автоматическая настройка

Используйте скрипт автоматической настройки:

```bash
bash setup.sh
```

Скрипт автоматически:
- Проверит зависимости
- Создаст виртуальное окружение
- Установит пакеты
- Создаст .env файл
- Применит миграции

## Что дальше?

1. **Настройте Celery** (для фоновых задач):
   ```bash
   # В отдельном терминале
   celery -A health_map worker --loglevel=info
   ```

2. **Создайте тестовые данные**:
   - Войдите в админ-панель: http://127.0.0.1:8000/admin/
   - Создайте награды, достижения и т.д.

3. **Протестируйте API**:
   - API доступен по адресу: http://127.0.0.1:8000/api/gamification/
   - Используйте Postman или curl для тестирования

## Полезные команды

```bash
# Создать миграции
python manage.py makemigrations

# Применить миграции
python manage.py migrate

# Создать суперпользователя
python manage.py createsuperuser

# Запустить сервер разработки
python manage.py runserver

# Запустить Celery worker
celery -A health_map worker --loglevel=info

# Запустить Celery beat (для периодических задач)
celery -A health_map beat --loglevel=info

# Проверить настройку
python check_setup.py

# Запустить тесты
python manage.py test gamification
```

## Решение проблем

### Ошибка "ModuleNotFoundError: No module named 'celery'"
```bash
pip install -r requirements.txt
```

### Ошибка подключения к базе данных
- Проверьте, что PostgreSQL запущен
- Проверьте настройки в `.env`
- Для тестирования можно использовать SQLite

### Ошибка миграций
```bash
python manage.py migrate --run-syncdb
```

## Дополнительная информация

Полная инструкция по настройке: см. `SETUP.md`

