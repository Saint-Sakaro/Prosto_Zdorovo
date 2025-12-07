#!/bin/bash

# Скрипт для быстрого запуска проекта через Docker

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Запуск проекта через Docker...${NC}"
echo ""

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Файл .env не найден!${NC}"
    if [ -f .env.docker ]; then
        echo -e "${YELLOW}Создаю .env из .env.docker...${NC}"
        cp .env.docker .env
        echo -e "${GREEN}✅ Файл .env создан${NC}"
    else
        echo -e "${YELLOW}Создаю .env из env.example...${NC}"
        cp env.example .env
        echo -e "${YELLOW}⚠️  Пожалуйста, отредактируйте .env файл перед запуском!${NC}"
        exit 1
    fi
fi

# Выбор конфигурации
COMPOSE_FILE="docker-compose.yml"
if [ "$1" == "simple" ] || [ "$1" == "-s" ]; then
    COMPOSE_FILE="docker-compose.simple.yml"
    echo -e "${BLUE}Используется упрощенная конфигурация (без Celery)${NC}"
else
    echo -e "${BLUE}Используется полная конфигурация (с Celery)${NC}"
fi

echo ""
echo -e "${GREEN}1️⃣  Остановка старых контейнеров...${NC}"
docker-compose -f $COMPOSE_FILE down 2>/dev/null || true

echo ""
echo -e "${GREEN}2️⃣  Сборка образов...${NC}"
docker-compose -f $COMPOSE_FILE build

echo ""
echo -e "${GREEN}3️⃣  Запуск контейнеров...${NC}"
docker-compose -f $COMPOSE_FILE up -d

echo ""
echo -e "${GREEN}4️⃣  Ожидание готовности сервисов...${NC}"
sleep 5

# Проверка статуса контейнеров
echo ""
echo -e "${GREEN}5️⃣  Проверка статуса...${NC}"
docker-compose -f $COMPOSE_FILE ps

echo ""
echo -e "${GREEN}6️⃣  Применение миграций...${NC}"
docker-compose -f $COMPOSE_FILE exec -T backend python manage.py migrate || echo "Миграции уже применены"

echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✅ ПРОЕКТ ЗАПУЩЕН!${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}🌐 Доступные адреса:${NC}"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   Admin:     http://localhost:8000/admin"
echo ""
echo -e "${BLUE}📋 Полезные команды:${NC}"
echo "   Просмотр логов:    docker-compose -f $COMPOSE_FILE logs -f"
echo "   Остановка:         docker-compose -f $COMPOSE_FILE down"
echo "   Перезапуск:        docker-compose -f $COMPOSE_FILE restart"
echo "   Статус:            docker-compose -f $COMPOSE_FILE ps"
echo ""
echo -e "${YELLOW}💡 Для создания суперпользователя:${NC}"
echo "   docker-compose -f $COMPOSE_FILE exec backend python manage.py createsuperuser"
echo ""

