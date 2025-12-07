# Быстрый старт OpenSearch

## ✅ Python клиент установлен

Клиент `opensearch-py` успешно установлен.

## ⚠️ Docker не запущен

Для запуска OpenSearch нужно:

### Вариант 1: Запустить Docker Desktop

1. Откройте Docker Desktop на Mac
2. Дождитесь полной загрузки (иконка в меню станет зеленой)
3. Затем выполните:

```bash
docker run -d \
  --name opensearch \
  -p 9200:9200 \
  -p 9600:9600 \
  -e "discovery.type=single-node" \
  -e "OPENSEARCH_INITIAL_ADMIN_PASSWORD=admin" \
  -e "plugins.security.disabled=true" \
  opensearchproject/opensearch:latest
```

### Вариант 2: Установить через Homebrew (если доступно)

```bash
brew install opensearch
brew services start opensearch
```

### Вариант 3: Использовать без OpenSearch (fallback режим)

Система автоматически использует Django ORM если OpenSearch недоступен. 
Приложение будет работать, но с меньшей точностью и скоростью.

## После запуска OpenSearch

1. Проверьте подключение:
```bash
curl http://localhost:9200
```

2. Переиндексируйте POI:
```bash
cd /Users/fedorbelov/Documents/Prosto_Zdorovo
export USE_SQLITE=True
python3 manage.py reindex_pois
```

## Текущий статус

- ✅ Python клиент установлен
- ⏳ OpenSearch сервер не запущен (Docker не доступен)
- ✅ Fallback режим активен (приложение работает через Django ORM)

