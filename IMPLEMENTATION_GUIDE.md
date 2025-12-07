# Руководство по реализации: Система динамических анкет и расчета рейтингов

## Обзор

Это руководство описывает поэтапную реализацию системы расчета Health Impact Score (HIS) на основе динамических анкет и отзывов пользователей.

## Этап 1: Модели данных ✅

### Задачи:

1. **Создать модель FormSchema**
   - Файл: `maps/models_ratings.py` (уже создан)
   - Добавить в `maps/models.py` или создать миграцию
   - Поля: category, schema_json, version, status и т.д.

2. **Обновить модель POI**
   - Добавить поля: `form_schema`, `form_data`, `verified`, `verified_by`, `verified_at`
   - Создать миграцию: `python manage.py makemigrations maps`
   - Применить: `python manage.py migrate`

3. **Обновить модель Review (в gamification/models.py)**
   - Добавить поля: `rating` (1-5), `poi` (ForeignKey), `sentiment_score`, `extracted_facts`
   - Создать миграцию: `python manage.py makemigrations gamification`
   - Применить: `python manage.py migrate`

4. **Обновить модель POIRating**
   - Добавить поля: `S_infra`, `S_social`, `S_HIS`, `last_infra_calculation`, `last_social_calculation`, `calculation_metadata`
   - Создать миграцию: `python manage.py makemigrations maps`
   - Применить: `python manage.py migrate`

### Команды:

```bash
# Создать миграции
python manage.py makemigrations maps
python manage.py makemigrations gamification

# Применить миграции
python manage.py migrate
```

### Проверка:

- Убедиться, что все модели созданы
- Проверить связи между моделями
- Создать тестовые данные для проверки

---

## Этап 2: Сервисы расчета рейтингов ✅

### Задачи:

1. **Реализовать InfrastructureScoreCalculator**
   - Файл: `maps/services/infrastructure_score_calculator.py` (уже создан)
   - Реализовать методы:
     - `calculate_infra_score()` - основной расчет
     - `normalize_field_value()` - нормализация значений
     - `calculate_weighted_sum()` - взвешенная сумма

2. **Реализовать SocialScoreCalculator**
   - Файл: `maps/services/social_score_calculator.py` (уже создан)
   - Реализовать методы:
     - `calculate_social_score()` - основной расчет
     - `calculate_time_decay()` - временной коэффициент
     - `calculate_author_weight()` - вес автора
     - `normalize_rating()` - нормализация оценки

3. **Реализовать HealthImpactScoreCalculator**
   - Файл: `maps/services/health_impact_score_calculator.py` (уже создан)
   - Реализовать методы:
     - `calculate_his()` - итоговый расчет
     - `calculate_full_rating()` - полный пересчет

### Тестирование:

```python
# Пример теста
from maps.services.health_impact_score_calculator import HealthImpactScoreCalculator

calculator = HealthImpactScoreCalculator()
result = calculator.calculate_full_rating(poi, save=False)
print(f"S_infra: {result['S_infra']}, S_social: {result['S_social']}, S_HIS: {result['S_HIS']}")
```

---

## Этап 3: Интеграция с LLM ⏳

### Задачи:

1. **Настроить LLM сервис**
   - Файл: `maps/services/llm_service.py` (уже создан)
   - Выбрать провайдера (OpenAI, YandexGPT, и т.д.)
   - Добавить API ключ в settings.py
   - Реализовать методы:
     - `generate_schema()` - генерация анкеты
     - `analyze_review()` - анализ отзыва
     - `check_sentiment_consistency()` - проверка сентимента

2. **Добавить настройки в settings.py**

Настройки GIGACHAT уже добавлены в `health_map/settings.py`:
```python
# GIGACHAT LLM настройки
GIGACHAT_CLIENT_ID = env('GIGACHAT_CLIENT_ID', default=None)
GIGACHAT_CLIENT_SECRET = env('GIGACHAT_CLIENT_SECRET', default=None)
GIGACHAT_SCOPE = env('GIGACHAT_SCOPE', default='GIGACHAT_API_PERS')
GIGACHAT_MODEL = env('GIGACHAT_MODEL', default='GigaChat')
```

Добавить в `.env` файл:
```
GIGACHAT_CLIENT_ID=your-client-id
GIGACHAT_CLIENT_SECRET=your-client-secret
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_MODEL=GigaChat
```

3. **Реализовать генерацию анкет**
   - Создать промпты для LLM
   - Парсить ответы LLM
   - Валидировать сгенерированные схемы

### Опционально:

- Можно отложить до этапа 4
- Использовать заглушки для тестирования
- Реализовать позже, когда будет доступ к LLM API

---

## Этап 4: API, сигналы и пересчет ✅

### Задачи:

1. **Обновить сигналы**
   - Файл: `maps/signals_ratings.py` (уже создан)
   - Подключить в `maps/apps.py`:
     ```python
     def ready(self):
         import maps.signals_ratings
     ```
   - Реализовать:
     - `recalculate_rating_on_poi_change()` - при изменении анкеты
     - `recalculate_rating_on_review_change()` - при изменении отзыва
     - `analyze_review_with_llm()` - анализ через LLM

2. **Добавить API эндпоинты**
   - Файл: `maps/views_ratings.py` (уже создан)
   - Подключить в `maps/urls.py`:
     ```python
     path('ratings/', include('maps.urls_ratings')),
     ```
   - Реализовать:
     - Управление схемами анкет
     - Обновление данных анкеты
     - Просмотр рейтингов
     - Пересчет рейтингов

3. **Обновить существующие serializers**
   - Добавить поля в `POISerializer`
   - Добавить поля в `ReviewSerializer`

### Команды:

```bash
# Обновить urls.py
# Добавить в maps/urls.py:
path('ratings/', include('maps.urls_ratings')),
```

---

## Этап 5: Фоновые задачи и оптимизация ✅

### Задачи:

1. **Добавить Celery задачи**
   - Файл: `maps/tasks_ratings.py` (уже создан)
   - Реализовать:
     - `recalculate_time_decay()` - ежедневный пересчет
     - `recalculate_category_ratings()` - пересчет для категории
     - `recalculate_all_ratings()` - полный пересчет

2. **Обновить celery.py**
   - Файл: `health_map/celery.py` (уже обновлен)
   - Добавлена задача `recalculate-time-decay`

3. **Оптимизация**
   - Кеширование промежуточных значений
   - Индексы в БД для быстрого поиска
   - Batch обработка для массовых операций

### Команды:

```bash
# Запустить Celery worker
celery -A health_map worker -l info

# Запустить Celery beat
celery -A health_map beat -l info
```

---

## Порядок реализации для бэкендера

### Шаг 1: Модели (1-2 дня)
1. Изучить `maps/models_ratings.py` и `maps/models_updates.py`
2. Добавить изменения в существующие модели
3. Создать и применить миграции
4. Проверить структуру БД

### Шаг 2: Сервисы расчета (2-3 дня)
1. Реализовать `InfrastructureScoreCalculator`
2. Реализовать `SocialScoreCalculator`
3. Реализовать `HealthImpactScoreCalculator`
4. Написать unit-тесты для формул

### Шаг 3: Сигналы и пересчет (1-2 дня)
1. Подключить сигналы из `maps/signals_ratings.py`
2. Реализовать логику пересчета
3. Протестировать на тестовых данных

### Шаг 4: API (1-2 дня)
1. Добавить serializers из `maps/serializers_ratings.py`
2. Добавить views из `maps/views_ratings.py`
3. Подключить URLs
4. Протестировать эндпоинты

### Шаг 5: LLM (опционально, 2-3 дня)
1. Настроить LLM сервис
2. Реализовать генерацию анкет
3. Реализовать анализ отзывов
4. Интегрировать с модерацией

### Шаг 6: Фоновые задачи (1 день)
1. Реализовать Celery задачи
2. Настроить расписание
3. Протестировать периодические задачи

---

## Формулы расчета

### S_infra (Инфраструктурный рейтинг)

```
Для каждого поля анкеты:
  s_i = normalize_field_value(field, value)
  Если direction == -1: s_i = 1 - s_i

S_infra_raw = Σ(w_i * s_i) / Σ(|w_i|)
S_infra = min(100, max(0, 100 * S_infra_raw))
```

### S_social (Социальный рейтинг)

```
Для каждого отзыва:
  s_j = (rating_j - 1) / 4  # Нормализация 1-5 → 0-1
  w_time = 2^(-age_days / 180)  # Time decay
  w_author = f(reputation)  # Вес автора
  w_j = w_time * w_author

S_social = 100 * Σ(w_j * s_j) / Σ(w_j)
Если отзывов нет: S_social = 50
```

### S_HIS (Итоговый индекс)

```
S_base = 0.7 * S_infra + 0.3 * S_social
S_raw = S_base + (5.0 if verified else 0.0)
S_HIS = min(100, max(0, S_raw))
```

---

## Важные замечания

1. **Обратная совместимость**: Поле `health_score` в POIRating должно быть алиасом для `S_HIS`

2. **Миграция данных**: Для существующих объектов нужно:
   - Создать дефолтные схемы анкет для категорий
   - Инициализировать S_infra = 50.0, S_social = 50.0, S_HIS = 50.0

3. **Производительность**: 
   - Пересчет рейтинга должен быть асинхронным для больших объемов
   - Использовать select_related/prefetch_related для оптимизации запросов

4. **Валидация**: 
   - Проверять корректность данных анкеты перед сохранением
   - Валидировать соответствие значений схеме

---

## Чек-лист реализации

### Этап 1: Модели
- [ ] Создана модель FormSchema
- [ ] Обновлена модель POI (form_data, verified)
- [ ] Обновлена модель Review (rating, poi)
- [ ] Обновлена модель POIRating (S_infra, S_social, S_HIS)
- [ ] Созданы и применены миграции

### Этап 2: Сервисы
- [ ] Реализован InfrastructureScoreCalculator
- [ ] Реализован SocialScoreCalculator
- [ ] Реализован HealthImpactScoreCalculator
- [ ] Написаны тесты для формул

### Этап 3: LLM (опционально)
- [ ] Настроен LLM сервис
- [ ] Реализована генерация анкет
- [ ] Реализован анализ отзывов

### Этап 4: API и сигналы
- [ ] Подключены сигналы
- [ ] Реализованы API эндпоинты
- [ ] Протестированы пересчеты

### Этап 5: Фоновые задачи
- [ ] Реализованы Celery задачи
- [ ] Настроено расписание
- [ ] Протестированы периодические задачи

---

## Вопросы для уточнения

1. Какой LLM провайдер использовать? (OpenAI, YandexGPT, другие)
2. Какие значения весов оптимальны? (infra_weight, social_weight)
3. Какой период полураспада для time decay? (180 дней из ТЗ или другой?)
4. Нужна ли миграция существующих данных?
5. Как обрабатывать объекты без анкет? (дефолтные значения?)

---

## Поддержка

При возникновении вопросов обращайтесь к архитектору проекта.

