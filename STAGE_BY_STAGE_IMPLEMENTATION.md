# Поэтапная реализация: Система динамических анкет и рейтингов

## 📋 Общая информация

**Цель:** Реализовать систему расчета Health Impact Score (HIS) 0-100 на основе динамических анкет и отзывов.

**Статус:** Архитектура готова, файлы созданы с комментариями `# TODO:`

**Порядок:** Реализация по этапам, каждый этап независим и может тестироваться отдельно.

---

## 🎯 ЭТАП 1: Модели данных

### Цель этапа
Создать структуру данных для хранения анкет и обновить существующие модели.

### Файлы для работы:
- ✅ `maps/models_ratings.py` - модель FormSchema (создан)
- ✅ `maps/models_updates.py` - описание изменений (создан)
- ⚠️ `maps/models.py` - нужно добавить изменения
- ⚠️ `gamification/models.py` - нужно добавить поля в Review

### Задачи:

#### 1.1. Добавить модель FormSchema в maps/models.py

```python
# Скопировать из maps/models_ratings.py
from maps.models_ratings import FormSchema
```

Или добавить напрямую в `maps/models.py` после существующих моделей.

#### 1.2. Обновить модель POI

Добавить в класс `POI` в `maps/models.py`:

```python
# Связь со схемой анкеты
form_schema = models.ForeignKey(
    'maps.FormSchema',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='pois',
    verbose_name='Схема анкеты'
)

# Заполненные данные анкеты (JSON)
form_data = models.JSONField(
    default=dict,
    blank=True,
    verbose_name='Данные анкеты'
)

# Верификация объекта
verified = models.BooleanField(
    default=False,
    verbose_name='Верифицирован'
)

verified_by = models.ForeignKey(
    User,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='verified_pois',
    verbose_name='Верифицировал'
)

verified_at = models.DateTimeField(
    null=True,
    blank=True,
    verbose_name='Дата верификации'
)
```

#### 1.3. Обновить модель Review (в gamification/models.py)

Добавить в класс `Review`:

```python
# Оценка отзыва (1-5)
rating = models.IntegerField(
    null=True,
    blank=True,
    validators=[MinValueValidator(1), MaxValueValidator(5)],
    verbose_name='Оценка (1-5)'
)

# Прямая связь с POI (опционально, для оптимизации)
poi = models.ForeignKey(
    'maps.POI',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='reviews',
    verbose_name='Объект POI'
)

# Результаты LLM анализа
sentiment_score = models.FloatField(
    null=True,
    blank=True,
    validators=[MinValueValidator(-1.0), MaxValueValidator(1.0)],
    verbose_name='Сентимент (LLM)'
)

extracted_facts = models.JSONField(
    default=dict,
    blank=True,
    verbose_name='Извлеченные факты (LLM)'
)
```

#### 1.4. Обновить модель POIRating

Добавить в класс `POIRating` в `maps/models.py`:

```python
# Компоненты рейтинга
S_infra = models.FloatField(
    default=50.0,
    validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
    verbose_name='Инфраструктурный рейтинг'
)

S_social = models.FloatField(
    default=50.0,
    validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
    verbose_name='Социальный рейтинг'
)

S_HIS = models.FloatField(
    default=50.0,
    validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
    verbose_name='Health Impact Score'
)

# Метаданные расчета
last_infra_calculation = models.DateTimeField(
    null=True,
    blank=True,
    verbose_name='Последний расчет S_infra'
)

last_social_calculation = models.DateTimeField(
    null=True,
    blank=True,
    verbose_name='Последний расчет S_social'
)

calculation_metadata = models.JSONField(
    default=dict,
    blank=True,
    verbose_name='Метаданные расчета'
)
```

#### 1.5. Создать миграции

```bash
python manage.py makemigrations maps
python manage.py makemigrations gamification
python manage.py migrate
```

### ✅ Критерии завершения этапа 1:
- [ ] Модель FormSchema создана и мигрирована
- [ ] Модель POI обновлена (form_data, verified)
- [ ] Модель Review обновлена (rating, poi)
- [ ] Модель POIRating обновлена (S_infra, S_social, S_HIS)
- [ ] Миграции применены успешно
- [ ] Можно создать тестовые объекты через админку

---

## 🎯 ЭТАП 2: Сервисы расчета рейтингов

### Цель этапа
Реализовать алгоритмы расчета S_infra, S_social и итогового HIS.

### Файлы для работы:
- ✅ `maps/services/infrastructure_score_calculator.py` - создан с TODO
- ✅ `maps/services/social_score_calculator.py` - создан с TODO
- ✅ `maps/services/health_impact_score_calculator.py` - создан с TODO

### Задачи:

#### 2.1. Реализовать InfrastructureScoreCalculator

**Файл:** `maps/services/infrastructure_score_calculator.py`

**Методы для реализации:**
1. `calculate_infra_score()` - основной расчет
2. `normalize_field_value()` - нормализация значений полей
3. `calculate_weighted_sum()` - взвешенная сумма

**Формулы:**
- Boolean: true → 1.0 (если direction=+1), false → 0.0
- Range: (value - min) / (max - min) → [0;1]
- Select: mapping.get(value, 0.0)
- Photo: 1.0 если есть, 0.0 если нет

**Тестирование:**
```python
# Создать тестовый POI с анкетой
poi = POI.objects.get(...)
calculator = InfrastructureScoreCalculator()
score = calculator.calculate_infra_score(poi)
assert 0 <= score <= 100
```

#### 2.2. Реализовать SocialScoreCalculator

**Файл:** `maps/services/social_score_calculator.py`

**Методы для реализации:**
1. `calculate_social_score()` - основной расчет
2. `calculate_time_decay()` - временной коэффициент
3. `calculate_author_weight()` - вес автора
4. `normalize_rating()` - нормализация оценки

**Формулы:**
- Time decay: `2^(-age_days / 180)`
- Author weight: по репутации (novice=0.5, active=1.0, expert=1.5)
- Normalize rating: `(rating - 1) / 4`

**Тестирование:**
```python
calculator = SocialScoreCalculator()
score = calculator.calculate_social_score(poi)
assert 0 <= score <= 100
```

#### 2.3. Реализовать HealthImpactScoreCalculator

**Файл:** `maps/services/health_impact_score_calculator.py`

**Методы для реализации:**
1. `calculate_his()` - итоговый расчет
2. `calculate_full_rating()` - полный пересчет

**Формула:**
```
S_base = 0.7 * S_infra + 0.3 * S_social
S_HIS = S_base + (5.0 if verified else 0.0)
S_HIS = min(100, max(0, S_HIS))
```

**Тестирование:**
```python
calculator = HealthImpactScoreCalculator()
result = calculator.calculate_full_rating(poi, save=True)
assert 'S_infra' in result
assert 'S_social' in result
assert 'S_HIS' in result
```

### ✅ Критерии завершения этапа 2:
- [ ] Все методы реализованы
- [ ] Формулы работают корректно
- [ ] Написаны unit-тесты
- [ ] Можно рассчитать рейтинг для тестового объекта

---

## 🎯 ЭТАП 3: Интеграция с LLM (ОПЦИОНАЛЬНО)

### Цель этапа
Настроить генерацию анкет и анализ отзывов через LLM.

### Файлы для работы:
- ✅ `maps/services/llm_service.py` - создан с TODO

### Задачи:

#### 3.1. Настроить GIGACHAT

**Используется GIGACHAT от Сбера**

**Настройки уже добавлены в `health_map/settings.py`:**
```python
GIGACHAT_CLIENT_ID = env('GIGACHAT_CLIENT_ID', default=None)
GIGACHAT_CLIENT_SECRET = env('GIGACHAT_CLIENT_SECRET', default=None)
GIGACHAT_SCOPE = env('GIGACHAT_SCOPE', default='GIGACHAT_API_PERS')
GIGACHAT_MODEL = env('GIGACHAT_MODEL', default='GigaChat')
```

**Добавить в `.env` файл:**
```
GIGACHAT_CLIENT_ID=your-client-id
GIGACHAT_CLIENT_SECRET=your-client-secret
```

**Получить credentials:**
- Зарегистрироваться на https://developers.sber.ru/
- Создать приложение
- Получить Client ID и Client Secret

#### 3.2. Реализовать методы LLMService

1. `generate_schema()` - генерация анкеты
2. `analyze_review()` - анализ отзыва
3. `check_sentiment_consistency()` - проверка сентимента

### ⚠️ Важно:
- Можно отложить до этапа 4
- Использовать заглушки для тестирования
- Реализовать после настройки LLM API

### ✅ Критерии завершения этапа 3:
- [ ] LLM сервис настроен
- [ ] Генерация анкет работает
- [ ] Анализ отзывов работает

---

## 🎯 ЭТАП 4: API, сигналы и пересчет

### Цель этапа
Обеспечить автоматический пересчет рейтингов и API для работы с анкетами.

### Файлы для работы:
- ✅ `maps/signals_ratings.py` - создан с TODO
- ✅ `maps/serializers_ratings.py` - создан с TODO
- ✅ `maps/views_ratings.py` - создан с TODO
- ✅ `maps/urls_ratings.py` - создан

### Задачи:

#### 4.1. Подключить сигналы

**В `maps/apps.py`:**
```python
def ready(self):
    import maps.signals
    import maps.signals_ratings  # Добавить эту строку
```

**Реализовать в `maps/signals_ratings.py`:**
1. `recalculate_rating_on_poi_change()` - при изменении анкеты
2. `recalculate_rating_on_review_change()` - при изменении отзыва
3. `analyze_review_with_llm()` - анализ через LLM (опционально)

#### 4.2. Подключить API

**В `maps/urls.py`:**
```python
path('ratings/', include('maps.urls_ratings')),
```

**Реализовать в `maps/views_ratings.py`:**
1. `FormSchemaViewSet` - управление схемами
2. `POIFormDataView` - обновление данных анкеты
3. `POIRatingViewSet` - просмотр рейтингов

#### 4.3. Обновить существующие serializers

**В `maps/serializers.py`:**
- Добавить поля `form_data`, `verified` в `POISerializer`

**В `gamification/serializers.py`:**
- Добавить поле `rating` в `ReviewSerializer`

### ✅ Критерии завершения этапа 4:
- [ ] Сигналы подключены и работают
- [ ] API эндпоинты доступны
- [ ] Пересчет происходит автоматически
- [ ] Можно обновить анкету через API

---

## 🎯 ЭТАП 5: Фоновые задачи и оптимизация

### Цель этапа
Настроить периодический пересчет и оптимизировать производительность.

### Файлы для работы:
- ✅ `maps/tasks_ratings.py` - создан с TODO
- ✅ `health_map/celery.py` - обновлен

### Задачи:

#### 5.1. Реализовать Celery задачи

**В `maps/tasks_ratings.py`:**
1. `recalculate_time_decay()` - ежедневный пересчет
2. `recalculate_category_ratings()` - пересчет для категории
3. `recalculate_all_ratings()` - полный пересчет

#### 5.2. Настроить расписание

**В `health_map/celery.py` (уже добавлено):**
```python
'recalculate-time-decay': {
    'task': 'maps.tasks_ratings.recalculate_time_decay',
    'schedule': crontab(hour=4, minute=0),
}
```

#### 5.3. Оптимизация

- Добавить индексы в БД
- Кеширование промежуточных значений
- Batch обработка для массовых операций

### ✅ Критерии завершения этапа 5:
- [ ] Celery задачи реализованы
- [ ] Расписание настроено
- [ ] Периодический пересчет работает
- [ ] Производительность оптимизирована

---

## 📝 Итоговый чек-лист

### Этап 1: Модели
- [ ] FormSchema создана
- [ ] POI обновлена
- [ ] Review обновлена
- [ ] POIRating обновлена
- [ ] Миграции применены

### Этап 2: Сервисы
- [ ] InfrastructureScoreCalculator реализован
- [ ] SocialScoreCalculator реализован
- [ ] HealthImpactScoreCalculator реализован
- [ ] Тесты написаны

### Этап 3: LLM (опционально)
- [ ] LLM сервис настроен
- [ ] Генерация анкет работает
- [ ] Анализ отзывов работает

### Этап 4: API и сигналы
- [ ] Сигналы подключены
- [ ] API эндпоинты работают
- [ ] Пересчет автоматический

### Этап 5: Фоновые задачи
- [ ] Celery задачи реализованы
- [ ] Расписание настроено
- [ ] Оптимизация выполнена

---

## 🚀 Быстрый старт для бэкендера

1. **Прочитать:** `ARCHITECT_PROMPT.md` и `otzovy.tex`
2. **Изучить:** Созданные файлы с комментариями `# TODO:`
3. **Начать с этапа 1:** Модели данных
4. **Тестировать каждый этап:** Не переходить к следующему, пока текущий не работает
5. **Задавать вопросы:** При неясностях в формулах или логике

---

## 📚 Дополнительные материалы

- `ARCHITECTURE_PLAN.md` - общий план архитектуры
- `IMPLEMENTATION_GUIDE.md` - подробное руководство
- `maps/models_updates.py` - описание изменений моделей
- `maps/services/*.py` - сервисы с комментариями

