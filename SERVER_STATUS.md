# Статус запущенных серверов

## Запуск серверов

Серверы были запущены для тестирования проекта.

### Django Backend (Бэкенд)

- **URL:** http://localhost:8000
- **Админ-панель:** http://localhost:8000/admin/
- **API:** http://localhost:8000/api/gamification/
- **Статус:** ✅ Запущен
- **База данных:** SQLite (для тестирования)
- **Лог файл:** `/tmp/django_server.log`

Для проверки статуса:
```bash
curl http://localhost:8000/admin/
```

### React Frontend (Фронтенд)

- **URL:** http://localhost:3000
- **Статус:** ✅ Запущен
- **Лог файл:** `/tmp/react_server.log`

Для проверки статуса:
```bash
curl http://localhost:3000
```

## Команды для управления серверами

### Остановить серверы:

```bash
# Найти процессы
ps aux | grep "manage.py runserver"
ps aux | grep "react-scripts start"

# Остановить (замените PID на реальный)
kill <PID>
```

Или просто закройте терминалы где они запущены.

### Перезапустить Django сервер:

```bash
cd /Users/fedorbelov/Documents/Prosto_Zdorovo
export USE_SQLITE=True
python3 manage.py runserver 8000
```

### Перезапустить React сервер:

```bash
cd /Users/fedorbelov/Documents/Prosto_Zdorovo/frontend
npm start
```

## Проверка API

После запуска серверов можно проверить API:

1. **Список профилей:**
   ```bash
   curl http://localhost:8000/api/gamification/profiles/
   ```

2. **Список отзывов:**
   ```bash
   curl http://localhost:8000/api/gamification/reviews/
   ```

3. **Таблица лидеров:**
   ```bash
   curl http://localhost:8000/api/gamification/leaderboard/global/
   ```

**Важно:** Для доступа к защищенным эндпоинтам нужна авторизация (JWT токен).

## Создание суперпользователя

Для доступа к админ-панели создайте суперпользователя:

```bash
cd /Users/fedorbelov/Documents/Prosto_Zdorovo
export USE_SQLITE=True
python3 manage.py createsuperuser
```

Затем откройте http://localhost:8000/admin/ и войдите.

## Примечания

- **База данных:** Используется SQLite для быстрого тестирования. Для production используйте PostgreSQL.
- **Redis:** Требуется для Celery задач. Убедитесь что Redis запущен.
- **CORS:** Настроен для работы с фронтендом на localhost:3000

## Проблемы и решение

### Если сервер не запускается:

1. Проверьте логи:
   ```bash
   tail -f /tmp/django_server.log
   tail -f /tmp/react_server.log
   ```

2. Проверьте что порты свободны:
   ```bash
   lsof -i :8000  # Django
   lsof -i :3000  # React
   ```

3. Убедитесь что зависимости установлены:
   ```bash
   pip3 install -r requirements.txt
   cd frontend && npm install
   ```

