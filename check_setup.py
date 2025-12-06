#!/usr/bin/env python
"""
Скрипт для проверки настройки проекта

Проверяет:
- Подключение к базе данных
- Установленные зависимости
- Настройки окружения
- Доступность Redis
"""

import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'health_map.settings')
django.setup()

from django.conf import settings
from django.db import connection
from django.core.management import execute_from_command_line

def check_database():
    """Проверка подключения к базе данных"""
    print("Проверка подключения к базе данных...")
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result:
                print("✓ База данных: подключение успешно")
                return True
    except Exception as e:
        print(f"✗ База данных: ошибка подключения - {e}")
        return False

def check_redis():
    """Проверка подключения к Redis"""
    print("Проверка подключения к Redis...")
    try:
        import redis
        broker_url = settings.CELERY_BROKER_URL
        r = redis.from_url(broker_url)
        r.ping()
        print("✓ Redis: подключение успешно")
        return True
    except ImportError:
        print("✗ Redis: библиотека redis не установлена")
        return False
    except Exception as e:
        print(f"✗ Redis: ошибка подключения - {e}")
        print(f"  Проверьте, что Redis запущен и настройки в .env корректны")
        return False

def check_dependencies():
    """Проверка установленных зависимостей"""
    print("Проверка зависимостей...")
    required_packages = [
        'django',
        'djangorestframework',
        'geopy',
        'celery',
        'redis',
        'psycopg2',
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✓ {package}: установлен")
        except ImportError:
            print(f"✗ {package}: не установлен")
            missing.append(package)
    
    return len(missing) == 0

def check_settings():
    """Проверка настроек"""
    print("Проверка настроек...")
    issues = []
    
    if not settings.SECRET_KEY or settings.SECRET_KEY == 'django-insecure-change-me-in-production':
        issues.append("SECRET_KEY не настроен (используется значение по умолчанию)")
    
    if settings.DEBUG:
        print("⚠ DEBUG=True (режим разработки)")
    else:
        print("✓ DEBUG=False (production режим)")
    
    if hasattr(settings, 'GAMIFICATION_CONFIG'):
        print("✓ GAMIFICATION_CONFIG: настроен")
    else:
        issues.append("GAMIFICATION_CONFIG не найден")
    
    if issues:
        for issue in issues:
            print(f"⚠ {issue}")
        return False
    
    return True

def check_migrations():
    """Проверка миграций"""
    print("Проверка миграций...")
    try:
        from django.core.management import call_command
        from io import StringIO
        
        out = StringIO()
        call_command('showmigrations', '--list', stdout=out)
        output = out.getvalue()
        
        if '[X]' in output:
            print("✓ Миграции применены")
            return True
        else:
            print("⚠ Миграции не применены. Выполните: python manage.py migrate")
            return False
    except Exception as e:
        print(f"✗ Ошибка проверки миграций: {e}")
        return False

def main():
    """Основная функция проверки"""
    print("=" * 50)
    print("Проверка настройки проекта 'Карта здоровья'")
    print("=" * 50)
    print()
    
    results = {
        'dependencies': check_dependencies(),
        'settings': check_settings(),
        'database': check_database(),
        'redis': check_redis(),
        'migrations': check_migrations(),
    }
    
    print()
    print("=" * 50)
    print("Результаты проверки:")
    print("=" * 50)
    
    all_ok = True
    for check, result in results.items():
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{check.upper()}: {status}")
        if not result:
            all_ok = False
    
    print()
    if all_ok:
        print("✓ Все проверки пройдены! Проект готов к работе.")
        return 0
    else:
        print("✗ Некоторые проверки не пройдены. Исправьте ошибки и повторите.")
        print()
        print("Полезные команды:")
        print("  - Установить зависимости: pip install -r requirements.txt")
        print("  - Применить миграции: python manage.py migrate")
        print("  - Создать суперпользователя: python manage.py createsuperuser")
        return 1

if __name__ == '__main__':
    sys.exit(main())

