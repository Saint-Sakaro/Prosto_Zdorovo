#!/bin/bash

# Скрипт для запуска Django и React серверов

echo "🚀 Запуск серверов проекта 'Карта здоровья'..."
echo ""

# Переход в директорию проекта
cd "$(dirname "$0")"
PROJECT_DIR=$(pwd)

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка виртуального окружения
if [ ! -d "venv" ]; then
    echo "❌ Виртуальное окружение не найдено!"
    echo "Создайте его: python3 -m venv venv"
    exit 1
fi

# Функция очистки при выходе
cleanup() {
    echo ""
    echo "🛑 Остановка серверов..."
    pkill -f "manage.py runserver" 2>/dev/null
    pkill -f "react-scripts" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Остановка старых процессов
echo "🧹 Очистка старых процессов..."
pkill -f "manage.py runserver" 2>/dev/null
pkill -f "react-scripts" 2>/dev/null
sleep 1

# Запуск Django
echo ""
echo -e "${GREEN}1️⃣  Запуск Django Backend...${NC}"
cd "$PROJECT_DIR"
source venv/bin/activate
python manage.py runserver > /tmp/django_server.log 2>&1 &
DJANGO_PID=$!

# Ожидание запуска Django
sleep 3
if ps -p $DJANGO_PID > /dev/null; then
    echo -e "${GREEN}   ✅ Django запущен (PID: $DJANGO_PID)${NC}"
    echo "   🌐 http://127.0.0.1:8000/"
else
    echo -e "${YELLOW}   ⚠️  Django не запустился, проверьте логи: /tmp/django_server.log${NC}"
fi

# Проверка зависимостей React
if [ ! -d "frontend/node_modules" ]; then
    echo ""
    echo -e "${YELLOW}📦 Установка зависимостей React...${NC}"
    cd "$PROJECT_DIR/frontend"
    npm install
fi

# Запуск React
echo ""
echo -e "${GREEN}2️⃣  Запуск React Frontend...${NC}"
cd "$PROJECT_DIR/frontend"
BROWSER=none npm start > /tmp/react_server.log 2>&1 &
REACT_PID=$!

# Ожидание запуска React
sleep 5
if ps -p $REACT_PID > /dev/null || pgrep -f "react-scripts" > /dev/null; then
    echo -e "${GREEN}   ✅ React запущен${NC}"
    echo "   🌐 http://localhost:3000/"
else
    echo -e "${YELLOW}   ⚠️  React запускается, проверьте логи: /tmp/react_server.log${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✅ СЕРВЕРЫ ЗАПУЩЕНЫ!${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "🌐 Django Backend:  http://127.0.0.1:8000/"
echo "⚛️  React Frontend: http://localhost:3000/"
echo ""
echo "📋 Логи:"
echo "   Django: tail -f /tmp/django_server.log"
echo "   React:  tail -f /tmp/react_server.log"
echo ""
echo "🛑 Для остановки нажмите Ctrl+C"
echo ""

# Ожидание
wait

