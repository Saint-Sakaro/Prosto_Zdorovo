# Dockerfile для Django Backend
FROM python:3.11-slim

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Установка рабочей директории
WORKDIR /app

# Копирование requirements и установка зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование проекта
COPY . .

# Копирование entrypoint скрипта
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Создание директорий для статики и медиа
RUN mkdir -p staticfiles media

# Открытие порта
EXPOSE 8000

# Команда запуска (миграции и сборка статики выполняются в docker-compose)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

