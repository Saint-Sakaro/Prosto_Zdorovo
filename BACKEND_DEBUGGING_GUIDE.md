# Руководство по отладке бэкенда: Решение проблем

## 🎯 Ситуация

Фронтендер сделал всю работу, но бэкендер "погряз в ошибках". Это типичная ситуация, когда есть несоответствие между фронтом и бэком.

## 🔍 Шаг 1: Диагностика проблем

### 1.1. Проверьте, какие именно ошибки возникают

```bash
# Запустите сервер и посмотрите логи
python manage.py runserver

# Проверьте миграции
python manage.py showmigrations maps
python manage.py showmigrations gamification

# Проверьте синтаксис
python manage.py check
```

### 1.2. Проверьте соответствие API

**Проблема:** Фронтендер может вызывать эндпоинты, которых нет на бэке, или с неправильной структурой данных.

**Решение:** Сравните запросы фронтенда с тем, что ожидает бэкенд.

**Файлы для проверки:**
- `frontend/src/api/places.ts` - какие эндпоинты вызывает фронт
- `maps/urls.py` - какие эндпоинты зарегистрированы
- `maps/views.py` - что возвращают views
- `maps/serializers.py` - какие поля ожидают сериализаторы

### 1.3. Типичные проблемы и решения

## ❌ Проблема 1: "Endpoint not found" (404)

**Симптомы:**
- Фронтенд получает 404 при вызове API
- В логах Django: "Not Found: /api/maps/..."

**Причины:**
1. URL не зарегистрирован в `maps/urls.py`
2. Неправильный путь в `health_map/urls.py`
3. Опечатка в названии эндпоинта

**Решение:**

```python
# Проверьте maps/urls.py
router.register(r'pois/submissions', views.POISubmissionViewSet, basename='poi-submission')

# Проверьте health_map/urls.py
path('api/maps/', include('maps.urls')),

# Проверьте, что эндпоинт доступен:
# GET /api/maps/pois/submissions/ - должен работать
```

**Быстрая проверка:**
```bash
# Запустите сервер и проверьте доступные эндпоинты
python manage.py show_urls | grep submissions
```

## ❌ Проблема 2: "Serializer validation error" (400)

**Симптомы:**
- Фронтенд получает 400 Bad Request
- В ответе: `{"field_name": ["error message"]}`

**Причины:**
1. Фронтенд отправляет данные в неправильном формате
2. Сериализатор ожидает другие поля
3. Валидация не проходит

**Решение:**

**Шаг 1:** Посмотрите, что отправляет фронтенд:
```typescript
// frontend/src/api/places.ts
const data = {
  name: "...",
  address: "...",
  latitude: 55.7558,
  longitude: 37.6173,
  category_slug: "...",
  form_data: {...}
};
```

**Шаг 2:** Проверьте, что ожидает сериализатор:
```python
# maps/serializers.py - POISubmissionSerializer
class POISubmissionSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=500, required=True)
    address = serializers.CharField(max_length=500, required=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=True)
    # ...
```

**Шаг 3:** Добавьте логирование в сериализатор:
```python
def validate(self, attrs):
    print("=== VALIDATION DEBUG ===")
    print("Received data:", attrs)
    print("Initial data:", self.initial_data)
    return attrs
```

**Шаг 4:** Проверьте валидацию категории:
```python
# Убедитесь, что категория существует
category = POICategory.objects.get(slug=value, is_active=True)
```

## ❌ Проблема 3: "FormValidator not found" или "Import error"

**Симптомы:**
- `ImportError: cannot import name 'FormValidator'`
- `ModuleNotFoundError: No module named 'maps.services.form_validator'`

**Решение:**

**Проверьте, что файл существует:**
```bash
ls -la maps/services/form_validator.py
```

**Проверьте импорты:**
```python
# maps/serializers.py
from maps.services.form_validator import FormValidator  # Должен работать
```

**Если файла нет, создайте его:**
```python
# maps/services/form_validator.py
from maps.models import FormSchema
from typing import Dict, List, Tuple, Any

class FormValidator:
    def __init__(self, form_schema: FormSchema):
        self.form_schema = form_schema
        self.schema_fields = form_schema.get_fields()
    
    def validate(self, form_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []
        fields = self.schema_fields
        
        # Проверяем обязательные поля
        for field in fields:
            if field.get('required', False):
                field_id = field.get('id')
                if field_id not in form_data or form_data[field_id] is None:
                    errors.append(f'Поле "{field.get("label", field_id)}" обязательно')
        
        # Проверяем типы данных
        for field in fields:
            field_id = field.get('id')
            if field_id in form_data:
                value = form_data[field_id]
                field_type = field.get('type')
                
                if field_type == 'boolean' and not isinstance(value, bool):
                    errors.append(f'Поле "{field.get("label")}" должно быть boolean')
                elif field_type == 'range' and not isinstance(value, (int, float)):
                    errors.append(f'Поле "{field.get("label")}" должно быть числом')
                # ... и т.д.
        
        return len(errors) == 0, errors
```

## ❌ Проблема 4: "Category not found" или "FormSchema not found"

**Симптомы:**
- `POICategory.DoesNotExist`
- `FormSchema.DoesNotExist`

**Решение:**

**Шаг 1:** Проверьте, что категории созданы:
```python
# В Django shell
python manage.py shell

from maps.models import POICategory, FormSchema

# Проверьте категории
categories = POICategory.objects.all()
print(f"Всего категорий: {categories.count()}")
for cat in categories:
    print(f"- {cat.name} ({cat.slug})")
    try:
        schema = cat.form_schema
        print(f"  Схема: {schema.name}")
    except FormSchema.DoesNotExist:
        print(f"  ⚠️ Схема отсутствует!")
```

**Шаг 2:** Если категорий нет, создайте их:
```python
# Создайте категории из Excel или вручную
from maps.models import POICategory, FormSchema

category = POICategory.objects.create(
    name="Точки сбора мусора",
    slug="waste-collection-points",
    is_active=True
)

# Создайте схему
schema = FormSchema.objects.create(
    category=category,
    name="Схема для точек сбора мусора",
    schema_json={
        "fields": [
            {
                "id": "point_type",
                "type": "select",
                "label": "Тип точки",
                "options": ["Официальная", "Неофициальная"],
                "weight": 0.3,
                "direction": 1,
                "required": True
            }
        ],
        "version": "1.0"
    },
    status="approved"
)
```

## ❌ Проблема 5: "Permission denied" (403)

**Симптомы:**
- Фронтенд получает 403 Forbidden
- "You do not have permission to perform this action"

**Решение:**

**Проверьте права доступа:**
```python
# maps/views.py - POISubmissionViewSet
permission_classes = [permissions.IsAuthenticated]  # Требует авторизации

# Для модерации
@action(detail=True, methods=['post'], permission_classes=[IsModerator])
def moderate(self, request, uuid=None):
    # ...
```

**Проверьте, что пользователь авторизован:**
```python
# В Django shell
from django.contrib.auth.models import User
user = User.objects.get(username='testuser')
print(f"Is staff: {user.is_staff}")
print(f"Is authenticated: {user.is_authenticated}")
```

**Проверьте IsModerator:**
```python
# gamification/permissions.py
class IsModerator(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_staff  # Проверьте эту логику
```

## ❌ Проблема 6: "Database error" или проблемы с миграциями

**Симптомы:**
- `django.db.utils.OperationalError: no such column: moderation_status`
- `django.db.utils.IntegrityError: NOT NULL constraint failed`

**Решение:**

**Шаг 1:** Проверьте миграции:
```bash
python manage.py showmigrations maps
```

**Шаг 2:** Если миграции не применены:
```bash
python manage.py makemigrations maps
python manage.py migrate maps
```

**Шаг 3:** Если есть проблемы с существующими данными:
```python
# Создайте команду для фиксации данных
# maps/management/commands/fix_poi_data.py

from django.core.management.base import BaseCommand
from maps.models import POI

class Command(BaseCommand):
    def handle(self, *args, **options):
        # Установите дефолтные значения для существующих POI
        POI.objects.filter(moderation_status__isnull=True).update(
            moderation_status='approved'
        )
```

## ❌ Проблема 7: "Calculation error" при расчете рейтинга

**Симптомы:**
- Ошибка при вызове `calculate_infra_score()`
- `KeyError` или `AttributeError` в InfrastructureScoreCalculator

**Решение:**

**Добавьте обработку ошибок:**
```python
# maps/serializers.py - в методе create()
try:
    infra_calculator = InfrastructureScoreCalculator()
    preliminary_score = infra_calculator.calculate_infra_score(poi)
    poi.metadata = poi.metadata or {}
    poi.metadata['preliminary_s_infra'] = preliminary_score
    poi.save(update_fields=['metadata'])
except Exception as e:
    # Логируйте ошибку, но не падайте
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Ошибка расчета рейтинга для POI {poi.uuid}: {e}")
    # Установите дефолтное значение
    poi.metadata = poi.metadata or {}
    poi.metadata['preliminary_s_infra'] = 50.0
    poi.save(update_fields=['metadata'])
```

## 🔧 Шаг 2: Систематический подход к отладке

### 2.1. Создайте тестовый скрипт

**Файл:** `test_api_endpoints.py`

```python
"""
Скрипт для тестирования API эндпоинтов
Запуск: python manage.py shell < test_api_endpoints.py
"""

from django.contrib.auth.models import User
from maps.models import POICategory, POI, FormSchema
from maps.serializers import POISubmissionSerializer
from rest_framework.test import APIRequestFactory
from rest_framework.test import force_authenticate

# Создайте тестового пользователя
user, _ = User.objects.get_or_create(username='testuser', defaults={'email': 'test@test.com'})
user.set_password('testpass')
user.save()

# Создайте тестовую категорию
category, _ = POICategory.objects.get_or_create(
    slug='test-category',
    defaults={'name': 'Test Category', 'is_active': True}
)

# Создайте тестовую схему
try:
    schema = category.form_schema
except FormSchema.DoesNotExist:
    schema = FormSchema.objects.create(
        category=category,
        name='Test Schema',
        schema_json={'fields': [], 'version': '1.0'},
        status='approved'
    )

# Тестовые данные
test_data = {
    'name': 'Test POI',
    'address': 'Test Address',
    'latitude': 55.7558,
    'longitude': 37.6173,
    'category_slug': 'test-category',
    'form_data': {},
    'description': 'Test description'
}

# Тестируйте сериализатор
factory = APIRequestFactory()
request = factory.post('/api/maps/pois/submissions/', test_data)
force_authenticate(request, user=user)

serializer = POISubmissionSerializer(data=test_data, context={'request': request})
if serializer.is_valid():
    poi = serializer.save()
    print(f"✅ POI создан: {poi.uuid}")
else:
    print(f"❌ Ошибки валидации: {serializer.errors}")
```

### 2.2. Используйте Django Debug Toolbar или логирование

**Добавьте логирование:**
```python
# maps/views.py
import logging
logger = logging.getLogger(__name__)

class POISubmissionViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        logger.info(f"Creating POI submission by user {self.request.user.username}")
        try:
            poi = serializer.save()
            logger.info(f"POI created: {poi.uuid}")
        except Exception as e:
            logger.error(f"Error creating POI: {e}", exc_info=True)
            raise
```

## 🎯 Шаг 3: Проверка соответствия фронта и бэка

### 3.1. Создайте таблицу соответствия

| Фронтенд (API вызов) | Бэкенд (эндпоинт) | Статус |
|---------------------|-------------------|--------|
| `POST /api/maps/pois/submit/` | `POST /api/maps/pois/submissions/` | ⚠️ Несоответствие пути |
| `GET /api/maps/pois/submissions/` | `GET /api/maps/pois/submissions/` | ✅ |
| `GET /api/maps/pois/submissions/pending/` | `GET /api/maps/pois/submissions/pending/` | ✅ |
| `POST /api/maps/pois/submissions/{id}/moderate/` | `POST /api/maps/pois/submissions/{uuid}/moderate/` | ⚠️ UUID vs ID |

**Решение несоответствий:**

**Вариант 1:** Изменить бэкенд (рекомендуется)
```python
# maps/urls.py - добавьте алиас
router.register(r'pois/submit', views.POISubmissionViewSet, basename='poi-submit')
```

**Вариант 2:** Изменить фронтенд
```typescript
// frontend/src/api/places.ts
export const createPlaceSubmission = async (data: PlaceSubmissionData) => {
  const response = await api.post('/maps/pois/submissions/', data);  // Изменить путь
  return response.data;
};
```

### 3.2. Проверьте структуру данных

**Фронтенд отправляет:**
```typescript
{
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category_slug: string;
  form_data: Record<string, any>;
}
```

**Бэкенд ожидает:**
```python
# maps/serializers.py - POISubmissionSerializer
name = serializers.CharField(...)
address = serializers.CharField(...)
latitude = serializers.DecimalField(...)
longitude = serializers.DecimalField(...)
category_slug = serializers.SlugField(...)
form_data = serializers.JSONField(...)
```

**Проблема:** `latitude` и `longitude` - это `DecimalField`, а фронтенд отправляет `number`.

**Решение:**
```python
# Сериализатор автоматически конвертирует, но можно добавить валидацию
def validate_latitude(self, value):
    if not (-90 <= float(value) <= 90):
        raise serializers.ValidationError("Широта должна быть от -90 до 90")
    return value
```

## 🚀 Шаг 4: Быстрые исправления

### 4.1. Добавьте обработку ошибок везде

```python
# maps/views.py
from rest_framework.exceptions import ValidationError

class POISubmissionViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        try:
            poi = serializer.save()
        except ValidationError as e:
            # Логируйте и возвращайте понятную ошибку
            logger.error(f"Validation error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            raise ValidationError("Произошла ошибка при создании заявки")
```

### 4.2. Добавьте подробные сообщения об ошибках

```python
# maps/serializers.py
def validate_form_data(self, value):
    # ...
    if not is_valid:
        # Вместо просто списка ошибок, верните понятное сообщение
        error_message = "Ошибки в данных формы:\n" + "\n".join(f"- {e}" for e in errors)
        raise serializers.ValidationError(error_message)
```

### 4.3. Создайте эндпоинт для проверки здоровья API

```python
# maps/views.py
class HealthCheckView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        return Response({
            'status': 'ok',
            'endpoints': {
                'submissions': '/api/maps/pois/submissions/',
                'categories': '/api/maps/categories/',
                'pending': '/api/maps/pois/submissions/pending/',
            },
            'categories_count': POICategory.objects.filter(is_active=True).count(),
            'pending_submissions': POI.objects.filter(moderation_status='pending').count(),
        })
```

## 📋 Чек-лист для бэкендера

- [ ] Все эндпоинты зарегистрированы в `urls.py`
- [ ] Сериализаторы валидируют данные правильно
- [ ] Все импорты работают (нет `ImportError`)
- [ ] Категории и схемы созданы в БД
- [ ] Миграции применены
- [ ] Права доступа настроены правильно
- [ ] Обработка ошибок добавлена везде
- [ ] Логирование работает
- [ ] API соответствует тому, что ожидает фронтенд
- [ ] Тестовые запросы проходят успешно

## 🆘 Если ничего не помогает

1. **Создайте минимальный тестовый эндпоинт:**
```python
@api_view(['GET'])
def test_endpoint(request):
    return Response({'status': 'ok', 'message': 'API работает'})
```

2. **Проверьте, что Django вообще запускается:**
```bash
python manage.py runserver
# Откройте http://127.0.0.1:8000/admin/
```

3. **Проверьте логи Django:**
```python
# settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
}
```

4. **Обратитесь за помощью с конкретными ошибками:**
   - Точный текст ошибки
   - Стек-трейс
   - Что делали перед ошибкой
   - Какие данные отправляли

---

**Главное:** Не паникуйте! Большинство проблем решаются систематической проверкой каждого компонента. Начните с простого - проверьте, что эндпоинты доступны, затем проверьте валидацию данных, затем проверьте логику.
