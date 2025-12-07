# 🐳 Docker Setup для проекта "Карта здоровья"

Этот проект полностью настроен для работы с Docker и Docker Compose, что позволяет быстро запустить проект на любой системе.

## 📋 Требования

- Docker (версия 20.10+)
- Docker Compose (версия 2.0+)

## 🚀 Быстрый старт

### 1. Клонирование проекта

```bash
git clone <repository-url>
cd Prosto_Zdorovo
```

### 2. Настройка переменных окружения

```bash
# Скопируйте пример файла окружения
cp env.example .env

# Отредактируйте .env файл (минимальные настройки)
nano .env
```

**Минимальные настройки в `.env`:**
```env
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,backend

DB_NAME=health_map
DB_USER=postgres
DB_PASSWORD=postgres

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

### 3. Запуск проекта

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f
```

### 4. Применение миграций и создание суперпользователя

```bash
# Применение миграций
docker-compose exec backend python manage.py migrate

# Создание суперпользователя
docker-compose exec backend python manage.py createsuperuser
```

### 5. Доступ к сервисам

После запуска будут доступны:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## 🔄 Обновление проекта

### Автоматическое обновление

Используйте скрипт для обновления:

```bash
chmod +x docker-update.sh
./docker-update.sh
```

Скрипт автоматически:
1. Остановит контейнеры
2. Пересоберет образы
3. Запустит контейнеры
4. Применит миграции
5. Соберет статику

### Ручное обновление

```bash
# Остановка контейнеров
docker-compose down

# Пересборка образов
docker-compose build --no-cache

# Запуск контейнеров
docker-compose up -d

# Применение миграций
docker-compose exec backend python manage.py migrate

# Сборка статики
docker-compose exec backend python manage.py collectstatic --noinput
```

---

## 🛠️ Полезные команды

### Управление контейнерами

```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Просмотр статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f [service_name]
```

### Работа с базой данных

```bash
# Подключение к PostgreSQL
docker-compose exec db psql -U postgres -d health_map

# Создание резервной копии
docker-compose exec db pg_dump -U postgres health_map > backup.sql

# Восстановление из резервной копии
docker-compose exec -T db psql -U postgres health_map < backup.sql
```

### Django команды

```bash
# Применение миграций
docker-compose exec backend python manage.py migrate

# Создание миграций
docker-compose exec backend python manage.py makemigrations

# Создание суперпользователя
docker-compose exec backend python manage.py createsuperuser

# Django shell
docker-compose exec backend python manage.py shell

# Сборка статики
docker-compose exec backend python manage.py collectstatic --noinput
```

### Очистка

```bash
# Остановка и удаление контейнеров
docker-compose down

# Удаление контейнеров, сетей и volumes
docker-compose down -v

# Удаление образов
docker-compose down --rmi all

# Полная очистка (контейнеры, volumes, образы)
docker-compose down -v --rmi all
```

---

## 🏗️ Структура Docker

### Сервисы

1. **db** - PostgreSQL база данных
2. **redis** - Redis для Celery
3. **backend** - Django приложение
4. **frontend** - React приложение (production build с nginx)
5. **celery_worker** - Celery worker для фоновых задач
6. **celery_beat** - Celery beat для периодических задач

### Volumes

- `postgres_data` - данные PostgreSQL
- `static_volume` - статические файлы Django
- `media_volume` - медиа файлы

---

## 🔧 Development режим

Для разработки используйте `docker-compose.dev.yml`:

```bash
# Запуск в dev режиме
docker-compose -f docker-compose.dev.yml up -d

# Остановка
docker-compose -f docker-compose.dev.yml down
```

В dev режиме:
- Hot-reload для React
- Автоматическая перезагрузка Django
- Монтирование исходного кода

---

## 🐛 Решение проблем

### Порт уже занят

```bash
# Проверка занятых портов
lsof -i :8000
lsof -i :3000
lsof -i :5432

# Изменение портов в docker-compose.yml
ports:
  - "8001:8000"  # Вместо 8000:8000
```

### Проблемы с правами доступа

```bash
# Исправление прав на volumes
sudo chown -R $USER:$USER .
```

### Очистка Docker

```bash
# Удаление неиспользуемых образов
docker system prune -a

# Удаление всех volumes
docker volume prune
```

### Пересборка без кэша

```bash
docker-compose build --no-cache
docker-compose up -d
```

---

## 📝 Переменные окружения

Основные переменные окружения (см. `env.example`):

- `SECRET_KEY` - секретный ключ Django
- `DEBUG` - режим отладки (True/False)
- `ALLOWED_HOSTS` - разрешенные хосты
- `DB_NAME`, `DB_USER`, `DB_PASSWORD` - настройки БД
- `CORS_ALLOWED_ORIGINS` - разрешенные источники для CORS
- `CELERY_BROKER_URL` - URL брокера Celery
- `CELERY_RESULT_BACKEND` - бэкенд результатов Celery

---

## 🚀 Production деплой

Для production:

1. Установите `DEBUG=False` в `.env`
2. Измените `SECRET_KEY` на безопасный
3. Настройте `ALLOWED_HOSTS`
4. Используйте внешний PostgreSQL (если нужно)
5. Настройте SSL/TLS для nginx
6. Используйте Docker secrets для паролей

---

## 📚 Дополнительная информация

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Django Deployment](https://docs.djangoproject.com/en/stable/howto/deployment/)

---

**Удачной разработки! 🎉**

