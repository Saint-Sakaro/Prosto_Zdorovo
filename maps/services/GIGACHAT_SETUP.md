# Настройка GIGACHAT для проекта

## Получение credentials

1. Зарегистрируйтесь на https://developers.sber.ru/
2. Создайте новое приложение
3. Получите:
   - **Client ID** - идентификатор приложения
   - **Client Secret** - секретный ключ приложения

## Настройка переменных окружения

Добавьте в файл `.env`:

```bash
GIGACHAT_CLIENT_ID=your-client-id-here
GIGACHAT_CLIENT_SECRET=your-client-secret-here
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_MODEL=GigaChat
```

## Проверка работы

После настройки можно протестировать:

```python
from maps.services.llm_service import LLMService

llm = LLMService()
schema = llm.generate_schema("Аптека", "Медицинское учреждение")
print(schema)
```

## Документация GIGACHAT

- Официальная документация: https://developers.sber.ru/docs/ru/gigachat/api
- API авторизации: https://developers.sber.ru/docs/ru/gigachat/api/authorization
- Python SDK: https://developers.sber.ru/docs/ru/gigachain/tools/python/langchain-gigachat

## Важные замечания

1. **SSL сертификаты**: GIGACHAT требует валидные SSL сертификаты. При проблемах с подключением проверьте сертификаты.

2. **Rate limits**: GIGACHAT имеет лимиты на количество запросов. При превышении лимита запросы будут отклоняться.

3. **Токены**: Access token имеет ограниченное время жизни. Сервис автоматически обновляет токен при необходимости.

4. **Модель**: По умолчанию используется модель `GigaChat`. Можно изменить через переменную окружения `GIGACHAT_MODEL`.

