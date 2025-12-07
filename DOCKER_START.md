# 🚀 Быстрый запуск через Docker

## Один скрипт для запуска всего проекта

### Простой запуск

```bash
./docker-start.sh
```

Или с упрощенной конфигурацией (без Celery):

```bash
./docker-start.sh simple
```

---

## Что делает скрипт

1. ✅ Проверяет наличие `.env` файла (создает из `.env.docker` если нужно)
2. ✅ Останавливает старые контейнеры
3. ✅ Собирает Docker образы
4. ✅ Запускает все сервисы
5. ✅ Применяет миграции базы данных
6. ✅ Показывает статус и адреса

---

## Портовая конфигурация

После запуска проект доступен на следующих портах:

| Сервис | Порт | URL |
|--------|------|-----|
| **Frontend** | 3000 | http://localhost:3000 |
| **Backend API** | 8000 | http://localhost:8000 |
| **Admin Panel** | 8000 | http://localhost:8000/admin |
| **PostgreSQL** | 5432 | localhost:5432 |
| **Redis** | 6379 | localhost:6379 |

---

## Ручной запуск

Если хотите запустить вручную:

```bash
# 1. Настроить .env
cp .env.docker .env

# 2. Запустить контейнеры
docker-compose up -d

# 3. Применить миграции
docker-compose exec backend python manage.py migrate

# 4. Создать суперпользователя
docker-compose exec backend python manage.py createsuperuser
```

---

## Полезные команды

### Просмотр логов
```bash
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend
```

### Остановка
```bash
docker-compose down
```

### Перезапуск
```bash
docker-compose restart
```

### Статус контейнеров
```bash
docker-compose ps
```

### Вход в контейнер
```bash
# Backend
docker-compose exec backend bash

# Frontend
docker-compose exec frontend sh
```

### Выполнение Django команд
```bash
# Миграции
docker-compose exec backend python manage.py migrate

# Создание суперпользователя
docker-compose exec backend python manage.py createsuperuser

# Django shell
docker-compose exec backend python manage.py shell

# Сборка статики
docker-compose exec backend python manage.py collectstatic --noinput
```

---

## Обновление проекта

После внесения изменений в код:

```bash
./docker-update.sh
```

Или вручную:

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker-compose exec backend python manage.py migrate
```

---

## Решение проблем

### Порт уже занят

Если порт 8000 или 3000 занят, измените порты в `docker-compose.yml`:

```yaml
ports:
  - "8001:8000"  # Вместо 8000:8000
  - "3001:80"    # Вместо 3000:80
```

### Ошибка подключения к базе данных

Убедитесь, что в `.env` правильно настроены:
```env
DB_HOST=db
DB_PORT=5432
USE_SQLITE=False
```

### Контейнер не запускается

Проверьте логи:
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Пересборка с нуля

```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## Структура сервисов

### Полная конфигурация (docker-compose.yml)
- ✅ PostgreSQL база данных
- ✅ Redis
- ✅ Django Backend
- ✅ React Frontend
- ✅ Celery Worker
- ✅ Celery Beat

### Упрощенная конфигурация (docker-compose.simple.yml)
- ✅ PostgreSQL база данных
- ✅ Redis
- ✅ Django Backend
- ✅ React Frontend

---

**Готово! Проект запущен и доступен на http://localhost:3000** 🎉

