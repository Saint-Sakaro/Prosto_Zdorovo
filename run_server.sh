#!/bin/bash
# Скрипт для запуска Django сервера

cd "$(dirname "$0")"

# Устанавливаем переменные окружения если нужно
export USE_SQLITE=${USE_SQLITE:-True}

# Запускаем Django сервер через глобальный python3
# (GigaChat работает через глобальный python3, который использует библиотеки из venv)
python3 manage.py runserver 8000
