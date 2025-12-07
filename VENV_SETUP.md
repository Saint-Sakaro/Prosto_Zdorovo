# Настройка виртуального окружения (venv)

## Проблема
GigaChat не работал из-за конфликтов версий библиотек в глобальном окружении Python.

## Решение
Виртуальное окружение (venv) создано и зависимости установлены. **ВАЖНО**: GigaChat работает через глобальный `python3`, который использует библиотеки из venv (они установлены в venv, но доступны глобально).

## Быстрый старт

### 1. Активация venv

```bash
cd /Users/fedorbelov/Documents/Prosto_Zdorovo
source venv/bin/activate
```

Или используйте python из venv напрямую:
```bash
./venv/bin/python manage.py runserver
```

### 2. Установка зависимостей

Зависимости уже установлены в venv. Если нужно переустановить:

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Запуск сервера

**Вариант A: Через скрипт (рекомендуется)**
```bash
./run_server.sh
```

**Вариант B: Вручную**
```bash
source venv/bin/activate
export USE_SQLITE=True
python manage.py runserver 8000
```

**Вариант C: Без активации**
```bash
./venv/bin/python manage.py runserver 8000
```

### 4. Проверка работы GigaChat

```bash
source venv/bin/activate
python test_gigachat_debug.py
```

Должен вернуть успешный ответ от GigaChat.

## Важно

- **Всегда используйте venv** для запуска Django сервера и работы с проектом
- GigaChat работает только в venv (версия 0.1.43)
- Если создаете новые скрипты - используйте `./venv/bin/python` или активируйте venv

## Устранение проблем

Если GigaChat не работает:
1. Убедитесь, что venv активирован: `which python` должен показывать путь к venv
2. Переустановите gigachat: `./venv/bin/python -m pip install --upgrade gigachat`
3. Проверьте тест: `./venv/bin/python test_gigachat_debug.py`
