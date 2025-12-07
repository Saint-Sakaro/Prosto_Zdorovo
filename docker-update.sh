#!/bin/bash

# Скрипт для обновления Docker контейнеров с новыми изменениями

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Определение режима обновления
MODE=${1:-full}
COMPOSE_FILE="docker-compose.yml"

# Проверка аргументов
if [ "$1" == "dev" ] || [ "$1" == "-d" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    MODE="dev"
elif [ "$1" == "simple" ] || [ "$1" == "-s" ]; then
    COMPOSE_FILE="docker-compose.simple.yml"
    MODE="simple"
elif [ "$1" == "quick" ] || [ "$1" == "-q" ]; then
    MODE="quick"
elif [ "$1" == "help" ] || [ "$1" == "-h" ]; then
    echo "Использование: ./docker-update.sh [режим]"
    echo ""
    echo "Режимы:"
    echo "  (без аргументов) - Полное обновление (пересборка всех образов)"
    echo "  quick, -q        - Быстрое обновление (только перезапуск)"
    echo "  dev, -d          - Development режим"
    echo "  simple, -s       - Упрощенная конфигурация"
    echo "  help, -h         - Показать эту справку"
    exit 0
fi

echo -e "${BLUE}🔄 Обновление Docker контейнеров (режим: $MODE)...${NC}"
echo ""

if [ "$MODE" == "quick" ]; then
    # Быстрое обновление - только перезапуск
    echo -e "${YELLOW}⚡ Быстрое обновление (перезапуск контейнеров)...${NC}"
    docker-compose restart
    
    echo ""
    echo -e "${GREEN}✅ Быстрое обновление завершено!${NC}"
    echo ""
    echo "💡 Для полного обновления используйте: ./docker-update.sh"
else
    # Полное обновление
    echo -e "${YELLOW}1. Остановка контейнеров...${NC}"
    docker-compose -f $COMPOSE_FILE down

    # Пересборка образов
    echo -e "${YELLOW}2. Пересборка образов...${NC}"
    if [ "$MODE" == "dev" ]; then
        docker-compose -f $COMPOSE_FILE build
    else
        docker-compose -f $COMPOSE_FILE build --no-cache
    fi

    # Запуск контейнеров
    echo -e "${YELLOW}3. Запуск контейнеров...${NC}"
    docker-compose -f $COMPOSE_FILE up -d

    # Ожидание готовности
    echo -e "${YELLOW}4. Ожидание готовности сервисов...${NC}"
    sleep 5

    # Применение миграций
    echo -e "${YELLOW}5. Применение миграций...${NC}"
    docker-compose -f $COMPOSE_FILE exec -T backend python manage.py migrate || echo "Миграции уже применены"

    # Сборка статики
    echo -e "${YELLOW}6. Сборка статики...${NC}"
    docker-compose -f $COMPOSE_FILE exec -T backend python manage.py collectstatic --noinput || echo "Статика уже собрана"

    echo ""
    echo -e "${GREEN}✅ Обновление завершено!${NC}"
fi

echo ""
echo "🌐 Сервисы доступны:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend: http://localhost:8000"
echo "   - Admin: http://localhost:8000/admin"
echo ""
echo "📋 Полезные команды:"
echo "   Просмотр логов:    docker-compose -f $COMPOSE_FILE logs -f"
echo "   Статус:            docker-compose -f $COMPOSE_FILE ps"
echo "   Остановка:         docker-compose -f $COMPOSE_FILE down"
echo ""

