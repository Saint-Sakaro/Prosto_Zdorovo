# 🚀 Быстрый доступ к серверам

## ✅ Серверы запущены и работают!

### 🌐 React Frontend (Фронтенд)
**Откройте в браузере:**
👉 **http://localhost:3000**

Статус: ✅ HTTP 200 - Работает

---

### 🔧 Django Backend (Бэкенд)

**Админ-панель:**
👉 **http://localhost:8000/admin/**

**API эндпоинты:**
- Список профилей: http://localhost:8000/api/gamification/profiles/
- Список отзывов: http://localhost:8000/api/gamification/reviews/
- Таблица лидеров: http://localhost:8000/api/gamification/leaderboard/global/
- Маркетплейс: http://localhost:8000/api/gamification/rewards/
- Достижения: http://localhost:8000/api/gamification/achievements/

Статус: ✅ HTTP 302 - Работает (редирект на логин для админки)

---

## 🔑 Создание суперпользователя

Для доступа к админ-панели создайте суперпользователя:

```bash
cd /Users/fedorbelov/Documents/Prosto_Zdorovo
export USE_SQLITE=True
python3 manage.py createsuperuser
```

Затем откройте http://localhost:8000/admin/ и войдите.

---

## 📋 Полезные команды

### Остановить серверы:
```bash
ps aux | grep -E "(manage.py runserver|react-scripts)" | grep -v grep | awk '{print $2}' | xargs kill -9
```

### Перезапустить Django:
```bash
cd /Users/fedorbelov/Documents/Prosto_Zdorovo
export USE_SQLITE=True
python3 manage.py runserver 8000
```

### Перезапустить React:
```bash
cd /Users/fedorbelov/Documents/Prosto_Zdorovo/frontend
npm start
```

### Просмотр логов:
```bash
tail -f /tmp/django_server.log  # Django
tail -f /tmp/react_server.log   # React
```

---

## 🧪 Тестирование API

### Без авторизации (будет 401):
```bash
curl http://localhost:8000/api/gamification/profiles/
```

### С авторизацией (нужен JWT токен):
```bash
# Сначала получите токен
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'

# Затем используйте токен
curl http://localhost:8000/api/gamification/profiles/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

**Серверы запущены:** ✅  
**Время запуска:** $(date)

