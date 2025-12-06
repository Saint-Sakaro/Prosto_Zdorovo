# Модуль карт и анализа областей "здоровости"

## Описание

Модуль карт и анализа областей для веб-приложения "Карта здоровья". Реализует функционал отображения объектов инфраструктуры на карте, фильтрации по категориям и расчета интегрального индекса "здоровости" для выбранных областей.

## Архитектура

### Компоненты

1. **Модели** (`models.py`):
   - `POICategory` - Категории объектов (аптеки, спорт, питание и т.д.)
   - `POI` - Точки интереса (объекты инфраструктуры)
   - `POIRating` - Рейтинг "здоровости" объекта
   - `AreaAnalysis` - История анализов областей (опционально)

2. **Сервисы** (`services/`):
   - `AreaAnalysisService` - Анализ областей (радиус, bounding box)
   - `HealthIndexCalculator` - Расчет индекса "здоровости"
   - `POIFilterService` - Фильтрация объектов по категориям

3. **API** (`views.py`, `serializers.py`, `urls.py`):
   - `POIViewSet` - Управление точками интереса
   - `POICategoryViewSet` - Управление категориями
   - `AreaAnalysisView` - Единый эндпоинт для анализа областей

4. **Signals** (`signals.py`):
   - Автоматическое создание рейтинга при создании POI
   - Обновление рейтинга при модерации отзывов

## API Эндпоинты

### Получение POI

**GET** `/api/maps/pois/`

Query params:
- `category`: slug категории (фильтр)
- `categories`: список slug категорий через запятую
- `bbox`: bounding box (sw_lat,sw_lon,ne_lat,ne_lon)

Response:
```json
{
  "count": 100,
  "results": [
    {
      "uuid": "string",
      "name": "string",
      "category_name": "string",
      "category_slug": "string",
      "address": "string",
      "latitude": 55.7558,
      "longitude": 37.6173,
      "marker_color": "#FF0000",
      "health_score": 75.5
    }
  ]
}
```

### Получение POI в bounding box

**GET** `/api/maps/pois/in-bbox/`

Query params:
- `sw_lat`, `sw_lon`, `ne_lat`, `ne_lon`: координаты bounding box
- `categories`: список slug категорий через запятую

### Детали POI

**GET** `/api/maps/pois/{uuid}/`

Response:
```json
{
  "uuid": "string",
  "name": "string",
  "category": {...},
  "address": "string",
  "latitude": 55.7558,
  "longitude": 37.6173,
  "description": "string",
  "phone": "string",
  "website": "string",
  "rating": {
    "health_score": 75.5,
    "reviews_count": 10,
    "approved_reviews_count": 8
  }
}
```

### Получение категорий

**GET** `/api/maps/categories/`

Response:
```json
[
  {
    "uuid": "string",
    "name": "Аптеки",
    "slug": "pharmacy",
    "marker_color": "#00FF00",
    "health_weight": 1.5,
    "health_importance": 8
  }
]
```

### Анализ области

**POST** `/api/maps/analyze/`

#### Режим 1: Анализ по радиусу

Request body:
```json
{
  "analysis_type": "radius",
  "center_lat": 55.7558,
  "center_lon": 37.6173,
  "radius_meters": 1000,
  "category_filters": ["pharmacy", "sport"]
}
```

#### Режим 2: Анализ по городу/округу

Request body:
```json
{
  "analysis_type": "city",
  "sw_lat": 55.5,
  "sw_lon": 37.5,
  "ne_lat": 56.0,
  "ne_lon": 38.0,
  "category_filters": ["pharmacy", "sport"]
}
```

#### Режим 3: Анализ по улице/кварталу

Request body:
```json
{
  "analysis_type": "street",
  "sw_lat": 55.75,
  "sw_lon": 37.61,
  "ne_lat": 55.76,
  "ne_lon": 37.62,
  "category_filters": ["pharmacy"]
}
```

Response:
```json
{
  "health_index": 75.5,
  "health_interpretation": "Благополучная зона",
  "analysis_type": "radius",
  "area_name": "Москва, центр",
  "category_stats": {
    "pharmacy": {
      "name": "Аптеки",
      "count": 5,
      "average_health_score": 80.0
    },
    "sport": {
      "name": "Спорт",
      "count": 3,
      "average_health_score": 85.0
    }
  },
  "objects": [...],
  "total_count": 8,
  "area_params": {...}
}
```

## Интеграция с модулем геймификации

Модуль карт интегрирован с модулем геймификации:

1. **Отзывы влияют на рейтинг POI**: При создании и модерации отзывов (из модуля `gamification`) автоматически пересчитывается рейтинг соответствующего POI.

2. **Связь через координаты**: Отзывы типа `poi_review` связаны с POI через координаты (ближайший объект в радиусе).

3. **Рейтинг влияет на индекс**: При расчете индекса "здоровости" области учитывается рейтинг каждого объекта.

## Расчет индекса "здоровости"

Индекс рассчитывается как средневзвешенное значение рейтингов объектов с учетом:

- **Рейтинга объекта** (`health_score` из `POIRating`)
- **Веса категории** (`health_weight` из `POICategory`)
- **Важности категории** (`health_importance` из `POICategory`)
- **Надежности оценки** (количество подтвержденных отзывов)

Формула:
```
index = Σ(health_score × category_weight × importance_factor × reliability_factor) / Σ(weight)
```

## Категории объектов

Примеры категорий:
- `pharmacy` - Аптеки
- `healthy_food` - Места с полезной едой
- `alcohol_tobacco` - Точки продажи алкоголя и табака
- `sport` - Спортивные объекты
- `medical` - Медицинские учреждения
- `cafe_restaurant` - Заведения общепита

Каждая категория имеет:
- Вес для расчета индекса (`health_weight`)
- Важность для здоровья (`health_importance` 0-10)
- Цвет маркера на карте (`marker_color`)

## Статус реализации

✅ **Все основные функции реализованы и готовы к использованию!**

### ✅ Реализовано:

1. ✅ **Сервисы анализа областей** - все три режима (радиус, город, улица)
2. ✅ **Расчет индекса "здоровости"** - средневзвешенное значение с учетом категорий
3. ✅ **Фильтрация POI** - по категориям и bounding box
4. ✅ **API эндпоинты** - все эндпоинты работают
5. ✅ **Интеграция с геймификацией** - автоматическое обновление рейтингов POI при модерации отзывов
6. ✅ **Signals** - автоматическое создание и обновление рейтингов

### ✅ Геокодирование - РЕАЛИЗОВАНО:

1. ✅ **Геокодирование адресов**: Интеграция с Яндекс Geocoder API
   - Сервис `GeocoderService` полностью реализован
   - Массовое геокодирование в админке
   - API эндпоинт `/api/maps/geocode/`
   - Требует API ключ (настраивается через `.env`)

2. ✅ **Обратное геокодирование**: Получение названий областей
   - Автоматически используется в анализе областей
   - API эндпоинт `/api/maps/reverse-geocode/`
   - Требует API ключ

**Подробности:** См. `GEOCODER_IMPLEMENTATION.md` в корне проекта

### ⚠️ Опционально (требует дополнительной настройки):

1. **PostGIS**: Для оптимизации географических запросов (для больших объемов данных)
2. **Кеширование**: Кеширование результатов анализа (модель готова)

