# ⚡ Быстрое обновление Docker

## Самый быстрый способ

### Для изменений в Python коде (Django)

```bash
docker-compose restart backend
```

Изменения применятся автоматически благодаря volume монтированию!

### Для изменений в React коде

**Production:**
```bash
docker-compose build frontend && docker-compose up -d frontend
```

**Dev режим:**
```bash
# Просто сохраните файл - изменения применятся автоматически!
```

---

## Режимы обновления

### 1. Быстрое обновление (только перезапуск)

```bash
./docker-update.sh quick
```

Или:
```bash
docker-compose restart
```

**Когда использовать:**
- Изменили Python код (.py файлы)
- Изменили настройки Django
- НЕ меняли зависимости

### 2. Полное обновление (пересборка)

```bash
./docker-update.sh
```

**Когда использовать:**
- Изменили requirements.txt
- Изменили package.json
- Изменили Dockerfile
- Первый запуск

### 3. Development режим (hot-reload)

```bash
./docker-update.sh dev
```

**Когда использовать:**
- Активная разработка
- Нужна автоматическая перезагрузка
- Быстрая итерация

---

## Шпаргалка

| Что изменилось | Команда |
|----------------|---------|
| Python код | `docker-compose restart backend` |
| React код (prod) | `docker-compose build frontend && docker-compose up -d frontend` |
| React код (dev) | Сохранить файл (автоматически) |
| requirements.txt | `docker-compose build --no-cache backend && docker-compose up -d backend` |
| package.json | `docker-compose build --no-cache frontend && docker-compose up -d frontend` |
| Миграции | `docker-compose exec backend python manage.py migrate` |
| Все сразу | `./docker-update.sh` |

---

**Подробная документация:** [DOCKER_UPDATE.md](DOCKER_UPDATE.md)

