#!/bin/bash

# Скрипт автоматической настройки проекта "Карта здоровья"
# Использование: bash setup.sh

set -e  # Остановить выполнение при ошибке

echo "=========================================="
echo "Настройка проекта 'Карта здоровья'"
echo "=========================================="

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для проверки команды
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 установлен"
        return 0
    else
        echo -e "${RED}✗${NC} $1 не установлен"
        return 1
    fi
}

# Проверка зависимостей
echo ""
echo "Проверка зависимостей..."
check_command python3 || { echo "Установите Python 3"; exit 1; }
check_command pip3 || { echo "Установите pip3"; exit 1; }

# Проверка PostgreSQL
echo ""
echo "Проверка PostgreSQL..."
if check_command psql; then
    echo -e "${GREEN}PostgreSQL готов${NC}"
else
    echo -e "${YELLOW}PostgreSQL не найден. Установите его:${NC}"
    echo "  macOS: brew install postgresql@14"
    echo "  Linux: sudo apt-get install postgresql"
    read -p "Продолжить без PostgreSQL? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Проверка Redis
echo ""
echo "Проверка Redis..."
if check_command redis-cli; then
    echo -e "${GREEN}Redis готов${NC}"
else
    echo -e "${YELLOW}Redis не найден. Установите его:${NC}"
    echo "  macOS: brew install redis"
    echo "  Linux: sudo apt-get install redis-server"
    read -p "Продолжить без Redis? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Создание виртуального окружения
echo ""
echo "Создание виртуального окружения..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✓${NC} Виртуальное окружение создано"
else
    echo -e "${YELLOW}Виртуальное окружение уже существует${NC}"
fi

# Активация виртуального окружения
echo ""
echo "Активация виртуального окружения..."
source venv/bin/activate

# Обновление pip
echo ""
echo "Обновление pip..."
pip install --upgrade pip

# Установка зависимостей
echo ""
echo "Установка зависимостей из requirements.txt..."
pip install -r requirements.txt
echo -e "${GREEN}✓${NC} Зависимости установлены"

# Создание .env файла
echo ""
echo "Настройка переменных окружения..."
if [ ! -f ".env" ]; then
    cp env.example .env
    echo -e "${GREEN}✓${NC} Файл .env создан из env.example"
    echo -e "${YELLOW}⚠${NC} Не забудьте отредактировать .env файл с вашими настройками!"
else
    echo -e "${YELLOW}Файл .env уже существует${NC}"
fi

# Создание директорий
echo ""
echo "Создание необходимых директорий..."
mkdir -p media/rewards
mkdir -p media/achievements
mkdir -p staticfiles
echo -e "${GREEN}✓${NC} Директории созданы"

# Создание миграций
echo ""
echo "Создание миграций..."
python manage.py makemigrations
echo -e "${GREEN}✓${NC} Миграции созданы"

# Применение миграций
echo ""
echo "Применение миграций к базе данных..."
read -p "Применить миграции? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python manage.py migrate
    echo -e "${GREEN}✓${NC} Миграции применены"
else
    echo -e "${YELLOW}Миграции пропущены. Выполните: python manage.py migrate${NC}"
fi

# Создание суперпользователя
echo ""
echo "Создание суперпользователя..."
read -p "Создать суперпользователя для админ-панели? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python manage.py createsuperuser
    echo -e "${GREEN}✓${NC} Суперпользователь создан"
else
    echo -e "${YELLOW}Создание суперпользователя пропущено. Выполните: python manage.py createsuperuser${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Настройка завершена!${NC}"
echo "=========================================="
echo ""
echo "Следующие шаги:"
echo "1. Отредактируйте файл .env с вашими настройками"
echo "2. Убедитесь, что PostgreSQL и Redis запущены"
echo "3. Запустите сервер: python manage.py runserver"
echo "4. Запустите Celery worker: celery -A health_map worker --loglevel=info"
echo "5. Запустите Celery beat: celery -A health_map beat --loglevel=info"
echo ""
echo "Для тестирования функций:"
echo "  python manage.py shell"
echo "  >>> from gamification.test_functions import run_all_tests"
echo "  >>> run_all_tests()"
echo ""

