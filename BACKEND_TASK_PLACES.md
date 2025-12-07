# ТЗ для бэкендера: Система создания мест

## 📋 Обзор задачи

Реализовать систему создания мест с динамическими формами на основе категорий. Система должна поддерживать:
1. Ручное создание места пользователем
2. Массовую загрузку датасета модератором
3. Модерацию заявок (с опциональной поддержкой LLM)
4. Автоматический расчет начального рейтинга

---

## 🎯 ЭТАП 1: Очистка БД и обновление моделей

### Задача 1.1: Создать скрипт очистки БД

**Файл:** `maps/management/commands/cleanup_database.py`

```python
"""
TODO: Создать команду Django для очистки БД

Команда должна:
1. Удалить все POI (кроме тех, что созданы пользователями - если нужно сохранить)
2. Удалить все POICategory
3. Удалить все FormSchema
4. Удалить все POIRating
5. НЕ удалять User и связанные данные (UserProfile, Review и т.д.)

Использование:
    python manage.py cleanup_database --confirm

Опции:
    --confirm: Подтверждение очистки (обязательно)
    --keep-users-data: Сохранить данные пользователей (отзывы и т.д.)
"""

from django.core.management.base import BaseCommand
from maps.models import POI, POICategory, FormSchema, POIRating

class Command(BaseCommand):
    help = 'Очистить БД от POI, категорий и схем (сохранить пользователей)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Подтверждение очистки'
        )
        parser.add_argument(
            '--keep-users-data',
            action='store_true',
            help='Сохранить данные пользователей (отзывы)'
        )
    
    def handle(self, *args, **options):
        # TODO: Реализовать логику очистки
        # 1. Проверить --confirm
        # 2. Удалить POIRating
        # 3. Удалить POI
        # 4. Удалить FormSchema
        # 5. Удалить POICategory
        # 6. Вывести статистику удаленных записей
        pass
```

### Задача 1.2: Обновить модель POI

**Файл:** `maps/models.py`

```python
# TODO: Добавить в модель POI следующие поля:

class POI(models.Model):
    # ... существующие поля ...
    
    # TODO: Добавить поля для модерации
    MODERATION_STATUS_CHOICES = [
        ('pending', 'Ожидает модерации'),
        ('approved', 'Одобрено'),
        ('rejected', 'Отклонено'),
        ('changes_requested', 'Требуются изменения'),
    ]
    
    moderation_status = models.CharField(
        max_length=20,
        choices=MODERATION_STATUS_CHOICES,
        default='approved',  # Для существующих записей
        verbose_name='Статус модерации'
    )
    
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submitted_pois',
        verbose_name='Создал'
    )
    
    moderated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='moderated_pois',
        verbose_name='Модератор'
    )
    
    moderated_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата модерации'
    )
    
    moderation_comment = models.TextField(
        blank=True,
        verbose_name='Комментарий модератора'
    )
    
    # TODO: Добавить поле для вердикта LLM
    llm_verdict = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Вердикт LLM'
    )
    # Структура llm_verdict:
    # {
    #   "verdict": "approve|reject|review",
    #   "confidence": 0.0-1.0,
    #   "comment": "Текст комментария от LLM",
    #   "checked_at": "2024-01-01T00:00:00Z",
    #   "analysis": {
    #     "field_quality": "good|medium|poor",
    #     "health_impact": "positive|neutral|negative",
    #     "data_completeness": 0.0-1.0
    #   }
    # }
```

**Миграция:**
```bash
# TODO: Создать миграцию
python manage.py makemigrations maps --name add_moderation_fields_to_poi
python manage.py migrate
```

---

## 🎯 ЭТАП 2: Система категорий из Excel

### Задача 2.1: Создать сервис анализа Excel

**Файл:** `maps/services/excel_category_analyzer.py`

```python
"""
TODO: Создать сервис для анализа Excel файла и определения категорий

Сервис должен:
1. Парсить Excel файл
2. Определять категории по названиям листов
3. Анализировать колонки и определять типы данных
4. Генерировать предложения для FormSchema
"""

import pandas as pd
from typing import Dict, List, Any

class ExcelCategoryAnalyzer:
    """
    Анализатор Excel файла для определения категорий и полей
    """
    
    def __init__(self, excel_path: str):
        """
        TODO: Инициализация с путем к Excel файлу
        
        Args:
            excel_path: Путь к Excel файлу
        """
        self.excel_path = excel_path
        self.excel_file = None  # TODO: Загрузить Excel файл
    
    def analyze_sheet(self, sheet_name: str) -> Dict[str, Any]:
        """
        TODO: Проанализировать лист Excel
        
        Args:
            sheet_name: Название листа
            
        Returns:
            dict: {
                "category_name": str,
                "columns": [
                    {
                        "name": str,
                        "type": "text|number|boolean|date|coordinate",
                        "sample_values": [...],
                        "nullable": bool,
                        "suggested_field": {
                            "id": str,
                            "type": "text|range|select|boolean",
                            "label": str,
                            "weight": float,
                            "direction": 1 or -1
                        }
                    }
                ],
                "row_count": int
            }
        """
        pass
    
    def suggest_form_schema(self, sheet_name: str) -> Dict[str, Any]:
        """
        TODO: Предложить схему формы на основе анализа листа
        
        Args:
            sheet_name: Название листа
            
        Returns:
            dict: Структура FormSchema.schema_json
        """
        pass
    
    def get_all_sheets(self) -> List[str]:
        """
        TODO: Получить список всех листов в Excel файле
        
        Returns:
            list: Список названий листов
        """
        pass
```

### Задача 2.2: Создать команду импорта категорий

**Файл:** `maps/management/commands/import_categories_from_excel.py`

```python
"""
TODO: Создать команду для импорта категорий из Excel

Команда должна:
1. Читать Excel файл
2. Для каждого листа создавать категорию (если не существует)
3. Создавать FormSchema на основе анализа колонок
4. Определять веса и направления полей

Использование:
    python manage.py import_categories_from_excel path/to/file.xlsx --dry-run
"""

from django.core.management.base import BaseCommand
from maps.services.excel_category_analyzer import ExcelCategoryAnalyzer
from maps.models import POICategory, FormSchema

class Command(BaseCommand):
    help = 'Импортировать категории из Excel файла'
    
    def add_arguments(self, parser):
        parser.add_argument('excel_file', type=str, help='Путь к Excel файлу')
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Только показать, что будет создано, без сохранения'
        )
    
    def handle(self, *args, **options):
        # TODO: Реализовать импорт
        # 1. Загрузить Excel файл
        # 2. Для каждого листа:
        #    - Определить название категории
        #    - Создать или обновить POICategory
        #    - Проанализировать колонки
        #    - Создать FormSchema
        # 3. Вывести статистику
        pass
```

### Задача 2.3: Определить поля для каждой категории

**Файл:** `maps/services/category_fields_definition.py`

```python
"""
TODO: Определить стандартные поля для каждой категории из Excel

Для каждой категории нужно определить:
- Какие поля обязательны
- Какие поля опциональны
- Типы полей (boolean, range, select, text)
- Веса полей
- Направления полей (1 = положительное влияние, -1 = отрицательное)
"""

# TODO: Создать словарь с определениями полей для каждой категории

CATEGORY_FIELDS = {
    "Точки сбора мусора": [
        {
            "id": "point_type",
            "type": "select",
            "label": "Тип точки",
            "options": ["Официальная", "Неофициальная", "Временная"],
            "weight": 0.3,
            "direction": 1,
            "required": True
        },
        {
            "id": "condition",
            "type": "select",
            "label": "Состояние точки",
            "options": ["Отличное", "Хорошее", "Удовлетворительное", "Плохое"],
            "weight": 0.2,
            "direction": 1,
            "required": True
        },
        {
            "id": "pickup_frequency",
            "type": "select",
            "label": "Частота вывоза",
            "options": ["Ежедневно", "Через день", "Еженедельно", "Реже"],
            "weight": 0.2,
            "direction": 1,
            "required": False
        },
        {
            "id": "accessibility",
            "type": "boolean",
            "label": "Доступность для инвалидов",
            "weight": 0.1,
            "direction": 1,
            "required": False
        },
        {
            "id": "overflow",
            "type": "boolean",
            "label": "Переполнение",
            "weight": 0.2,
            "direction": -1,
            "required": False
        }
    ],
    "Промышленные предприятия": [
        # TODO: Определить поля на основе анализа Excel
        {
            "id": "enterprise_type",
            "type": "select",
            "label": "Тип предприятия",
            "options": ["Завод", "Фабрика", "Автомойка", "Другое"],
            "weight": 0.2,
            "direction": -1,  # Промышленность обычно негативно влияет
            "required": True
        },
        {
            "id": "eco_class",
            "type": "select",
            "label": "Экологический класс",
            "options": ["1", "2", "3", "4", "5"],
            "weight": 0.4,
            "direction": 1,
            "required": False
        },
        {
            "id": "has_filters",
            "type": "boolean",
            "label": "Наличие фильтров очистки",
            "weight": 0.3,
            "direction": 1,
            "required": False
        },
        {
            "id": "noise_level",
            "type": "range",
            "label": "Уровень шума (дБ)",
            "scale_min": 0,
            "scale_max": 120,
            "weight": 0.1,
            "direction": -1,
            "required": False
        }
    ],
    "Предприятия общественного питания": [
        # TODO: Определить поля на основе Excel (алкоголь, реклама и т.д.)
        {
            "id": "sells_alcohol",
            "type": "boolean",
            "label": "Продажа алкоголя",
            "weight": 0.3,
            "direction": -1,
            "required": True
        },
        {
            "id": "good_advertising",
            "type": "boolean",
            "label": "Хорошая реклама (пропаганда ЗОЖ)",
            "weight": 0.2,
            "direction": 1,
            "required": False
        },
        {
            "id": "bad_advertising",
            "type": "boolean",
            "label": "Плохая реклама (вредные продукты)",
            "weight": 0.3,
            "direction": -1,
            "required": False
        },
        {
            "id": "has_vegetarian_menu",
            "type": "boolean",
            "label": "Вегетарианское меню",
            "weight": 0.1,
            "direction": 1,
            "required": False
        },
        {
            "id": "hygiene_certificate",
            "type": "boolean",
            "label": "Гигиенический сертификат",
            "weight": 0.1,
            "direction": 1,
            "required": False
        }
    ],
    "Магазины": [
        # TODO: Определить поля на основе Excel
        {
            "id": "store_type",
            "type": "select",
            "label": "Тип магазина",
            "options": ["Продуктовый", "Супермаркет", "Торговый центр", "Другое"],
            "weight": 0.1,
            "direction": 0,  # Нейтральное
            "required": True
        },
        {
            "id": "has_organic_products",
            "type": "boolean",
            "label": "Органические продукты",
            "weight": 0.3,
            "direction": 1,
            "required": False
        },
        {
            "id": "sells_alcohol",
            "type": "boolean",
            "label": "Продажа алкоголя",
            "weight": 0.2,
            "direction": -1,
            "required": False
        },
        {
            "id": "sells_tobacco",
            "type": "boolean",
            "label": "Продажа табака",
            "weight": 0.3,
            "direction": -1,
            "required": False
        },
        {
            "id": "fresh_products_quality",
            "type": "range",
            "label": "Качество свежих продуктов (1-5)",
            "scale_min": 1,
            "scale_max": 5,
            "weight": 0.1,
            "direction": 1,
            "required": False
        }
    ],
    "Медицинские организации": [
        # TODO: Определить поля на основе Excel
        {
            "id": "organization_type",
            "type": "select",
            "label": "Тип организации",
            "options": ["Поликлиника", "Больница", "Центр здоровья", "Аптека", "Другое"],
            "weight": 0.2,
            "direction": 1,
            "required": True
        },
        {
            "id": "specialization",
            "type": "text",
            "label": "Специализация",
            "weight": 0.1,
            "direction": 1,
            "required": False
        },
        {
            "id": "has_license",
            "type": "boolean",
            "label": "Наличие лицензии",
            "weight": 0.3,
            "direction": 1,
            "required": True
        },
        {
            "id": "working_hours_24_7",
            "type": "boolean",
            "label": "Круглосуточная работа",
            "weight": 0.1,
            "direction": 1,
            "required": False
        },
        {
            "id": "accessible_for_disabled",
            "type": "boolean",
            "label": "Доступность для инвалидов",
            "weight": 0.2,
            "direction": 1,
            "required": False
        },
        {
            "id": "emergency_service",
            "type": "boolean",
            "label": "Служба экстренной помощи",
            "weight": 0.1,
            "direction": 1,
            "required": False
        }
    ]
}

# TODO: Создать функцию для генерации FormSchema из этого словаря
def create_form_schema_for_category(category: POICategory, fields_definition: List[Dict]) -> FormSchema:
    """
    TODO: Создать FormSchema для категории на основе определения полей
    
    Args:
        category: Объект POICategory
        fields_definition: Список определений полей
        
    Returns:
        FormSchema: Созданная схема
    """
    pass
```

---

## 🎯 ЭТАП 3: Ручное создание места пользователем

### Задача 3.1: Создать валидатор формы

**Файл:** `maps/services/form_validator.py`

```python
"""
TODO: Создать сервис для валидации данных формы на основе FormSchema

Сервис должен:
1. Проверять наличие обязательных полей
2. Проверять типы данных
3. Проверять диапазоны значений
4. Проверять соответствие значений опциям (для select)
"""

from maps.models import FormSchema
from typing import Dict, List, Tuple, Any

class FormValidator:
    """
    Валидатор данных формы на основе схемы
    """
    
    def __init__(self, form_schema: FormSchema):
        """
        TODO: Инициализация с FormSchema
        
        Args:
            form_schema: Схема формы для валидации
        """
        self.form_schema = form_schema
        self.schema_fields = form_schema.get_fields()
    
    def validate(self, form_data: Dict[str, Any]) -> Tuple[bool, List[str]]]:
        """
        TODO: Валидировать данные формы
        
        Args:
            form_data: Словарь с данными формы
            
        Returns:
            tuple: (is_valid: bool, errors: List[str])
        """
        errors = []
        
        # TODO: Реализовать валидацию:
        # 1. Проверить обязательные поля
        # 2. Проверить типы данных
        # 3. Проверить диапазоны (для range)
        # 4. Проверить соответствие опциям (для select)
        # 5. Проверить boolean значения
        
        return len(errors) == 0, errors
    
    def validate_field(self, field: Dict, value: Any) -> Tuple[bool, str]:
        """
        TODO: Валидировать одно поле
        
        Args:
            field: Определение поля из схемы
            value: Значение поля
            
        Returns:
            tuple: (is_valid: bool, error_message: str)
        """
        # TODO: Реализовать валидацию одного поля
        pass
```

### Задача 3.2: Создать serializer для заявки

**Файл:** `maps/serializers.py`

```python
# TODO: Добавить в maps/serializers.py

class POISubmissionSerializer(serializers.Serializer):
    """
    Serializer для создания заявки на место
    """
    name = serializers.CharField(max_length=500, required=True)
    address = serializers.CharField(max_length=500, required=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=True)
    category_slug = serializers.SlugField(required=True)
    form_data = serializers.JSONField(required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    
    def validate_category_slug(self, value):
        """
        TODO: Проверить существование категории
        """
        # TODO: Проверить, что категория существует и активна
        pass
    
    def validate_form_data(self, value):
        """
        TODO: Валидировать данные формы на основе схемы категории
        """
        # TODO: Получить FormSchema категории
        # TODO: Валидировать form_data через FormValidator
        pass
    
    def create(self, validated_data):
        """
        TODO: Создать POI со статусом pending
        
        Args:
            validated_data: Валидированные данные
            
        Returns:
            POI: Созданный объект
        """
        # TODO: Реализовать создание POI:
        # 1. Получить категорию по slug
        # 2. Получить FormSchema категории
        # 3. Создать POI со статусом pending
        # 4. Заполнить form_data
        # 5. Установить submitted_by = request.user
        # 6. Рассчитать начальный S_infra
        # 7. Сохранить POI
        pass
```

### Задача 3.3: Создать view для заявок

**Файл:** `maps/views.py`

```python
# TODO: Добавить в maps/views.py

class POISubmissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet для заявок на создание мест
    
    Эндпоинты:
    - POST /api/maps/pois/submit/ - создать заявку
    - GET /api/maps/pois/submissions/ - список заявок пользователя
    - GET /api/maps/pois/submissions/{id}/ - детали заявки
    """
    queryset = POI.objects.filter(moderation_status='pending')
    serializer_class = POISubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        TODO: Фильтровать заявки по пользователю (для обычных пользователей)
        Для модераторов - показывать все заявки
        """
        # TODO: Если пользователь - модератор, показать все
        # Если обычный пользователь - только свои заявки
        pass
    
    def perform_create(self, serializer):
        """
        TODO: Создать заявку с автоматической проверкой LLM (опционально)
        """
        # TODO: Сохранить заявку
        # TODO: Отправить на проверку LLM (асинхронно через Celery)
        pass
    
    @action(detail=False, methods=['get'], permission_classes=[IsModerator])
    def pending(self, request):
        """
        TODO: Получить список заявок на модерацию (только для модераторов)
        """
        # TODO: Вернуть список заявок со статусом pending
        pass
    
    @action(detail=True, methods=['post'], permission_classes=[IsModerator])
    def moderate(self, request, pk=None):
        """
        TODO: Модерировать заявку (только для модераторов)
        
        Body:
            {
                "action": "approve|reject|request_changes",
                "comment": "..."
            }
        """
        # TODO: Реализовать модерацию:
        # 1. Получить POI
        # 2. Обновить статус модерации
        # 3. Если approved:
        #    - Установить is_active = True
        #    - Рассчитать полный рейтинг (S_infra, S_social, S_HIS)
        #    - Создать POIRating
        # 4. Если rejected:
        #    - Отправить уведомление пользователю (опционально)
        # 5. Сохранить комментарий модератора
        pass
```

### Задача 3.4: Обновить URLs

**Файл:** `maps/urls.py`

```python
# TODO: Добавить в maps/urls.py

router.register(
    r'pois/submissions',
    POISubmissionViewSet,
    basename='poi-submission'
)
```

---

## 🎯 ЭТАП 4: Массовая загрузка датасета

### Задача 4.1: Создать парсер Excel

**Файл:** `maps/services/excel_parser.py`

```python
"""
TODO: Создать сервис для парсинга Excel файла и создания POI

Сервис должен:
1. Парсить Excel файл
2. Определять категорию для каждого листа
3. Сопоставлять колонки Excel с полями FormSchema
4. Создавать POI из строк Excel
"""

import pandas as pd
from typing import Dict, List, Any, Optional
from maps.models import POI, POICategory, FormSchema

class ExcelParser:
    """
    Парсер Excel файла для массовой загрузки POI
    """
    
    def __init__(self, excel_path: str):
        """
        TODO: Инициализация с путем к Excel файлу
        """
        self.excel_path = excel_path
        self.excel_file = None  # TODO: Загрузить Excel
    
    def parse_sheet(self, sheet_name: str, category: POICategory) -> List[Dict[str, Any]]:
        """
        TODO: Парсить лист Excel и создать список словарей с данными POI
        
        Args:
            sheet_name: Название листа
            category: Категория для этого листа
            
        Returns:
            list: Список словарей с данными для создания POI
        """
        # TODO: Реализовать парсинг:
        # 1. Прочитать лист
        # 2. Определить маппинг колонок Excel -> поля FormSchema
        # 3. Для каждой строки:
        #    - Извлечь адрес, координаты
        #    - Извлечь данные для form_data
        #    - Создать словарь с данными POI
        pass
    
    def map_columns_to_schema(self, columns: List[str], form_schema: FormSchema) -> Dict[str, str]:
        """
        TODO: Сопоставить колонки Excel с полями FormSchema
        
        Args:
            columns: Список названий колонок Excel
            form_schema: Схема формы
            
        Returns:
            dict: Маппинг {column_name: field_id}
        """
        # TODO: Реализовать умное сопоставление:
        # 1. По точному совпадению названий
        # 2. По похожести (fuzzy matching)
        # 3. По ключевым словам
        pass
    
    def create_poi_from_row(self, row: pd.Series, category: POICategory, column_mapping: Dict[str, str]) -> Dict[str, Any]:
        """
        TODO: Создать словарь данных POI из строки Excel
        
        Args:
            row: Строка DataFrame
            category: Категория
            column_mapping: Маппинг колонок -> поля
            
        Returns:
            dict: Данные для создания POI
        """
        # TODO: Реализовать создание словаря:
        # 1. Извлечь адрес (cfAddress)
        # 2. Извлечь координаты (cfLatitude, cfLongitude)
        # 3. Извлечь название (если есть)
        # 4. Заполнить form_data на основе column_mapping
        pass
```

### Задача 4.2: Создать view для массовой загрузки

**Файл:** `maps/views.py`

```python
# TODO: Добавить в maps/views.py

class BulkUploadView(APIView):
    """
    View для массовой загрузки POI из Excel файла
    
    Только для модераторов
    """
    permission_classes = [IsModerator]
    
    def post(self, request):
        """
        TODO: Загрузить Excel файл и создать POI
        
        Body:
            - file: Excel файл (multipart/form-data)
            - auto_create_categories: bool (создавать ли категории автоматически)
        
        Returns:
            Response с результатами загрузки:
            {
                "total": 100,
                "created": 95,
                "errors": 5,
                "errors_details": [...],
                "categories_created": [...]
            }
        """
        # TODO: Реализовать загрузку:
        # 1. Получить файл из request.FILES
        # 2. Валидировать файл (расширение, размер)
        # 3. Для каждого листа:
        #    - Определить категорию (по названию листа или создать новую)
        #    - Получить или создать FormSchema
        #    - Парсить лист через ExcelParser
        #    - Для каждой строки:
        #      * Создать POI со статусом approved
        #      * Заполнить form_data
        #      * Рассчитать S_infra
        #      * Сохранить POI
        # 4. Вернуть статистику
        pass
```

### Задача 4.3: Создать serializer для загрузки

**Файл:** `maps/serializers.py`

```python
# TODO: Добавить в maps/serializers.py

class BulkUploadSerializer(serializers.Serializer):
    """
    Serializer для массовой загрузки
    """
    file = serializers.FileField(required=True)
    auto_create_categories = serializers.BooleanField(default=False)
    
    def validate_file(self, value):
        """
        TODO: Валидировать файл
        """
        # TODO: Проверить расширение (.xlsx, .xls)
        # TODO: Проверить размер файла (макс 50MB)
        pass
```

---

## 🎯 ЭТАП 5: Редактор категорий

### Задача 5.1: Обновить POICategoryViewSet

**Файл:** `maps/views.py`

```python
# TODO: Обновить POICategoryViewSet для поддержки создания/редактирования

class POICategoryViewSet(viewsets.ModelViewSet):  # Изменить с ReadOnlyModelViewSet
    """
    ViewSet для категорий POI
    
    Эндпоинты:
    - GET /api/maps/categories/ - список категорий
    - POST /api/maps/categories/ - создать категорию (только модераторы)
    - PUT /api/maps/categories/{slug}/ - обновить категорию (только модераторы)
    - DELETE /api/maps/categories/{slug}/ - удалить категорию (только модераторы)
    """
    queryset = POICategory.objects.filter(is_active=True)
    serializer_class = POICategorySerializer
    lookup_field = 'slug'
    
    def get_permissions(self):
        """
        TODO: Разрешить создание/редактирование только модераторам
        """
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsModerator()]
```

### Задача 5.2: Создать FormSchemaViewSet

**Файл:** `maps/views_ratings.py` или создать новый файл

```python
# TODO: Добавить FormSchemaViewSet

class FormSchemaViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления схемами форм
    
    Эндпоинты:
    - GET /api/maps/schemas/ - список схем
    - GET /api/maps/schemas/{id}/ - детали схемы
    - POST /api/maps/schemas/ - создать схему (только модераторы)
    - PUT /api/maps/schemas/{id}/ - обновить схему (только модераторы)
    - GET /api/maps/categories/{slug}/schema/ - получить схему категории
    - PUT /api/maps/categories/{slug}/schema/ - обновить схему категории
    """
    queryset = FormSchema.objects.all()
    serializer_class = FormSchemaSerializer
    permission_classes = [IsModerator]
    
    @action(detail=False, methods=['get'], url_path='category/(?P<category_slug>[^/.]+)')
    def by_category(self, request, category_slug=None):
        """
        TODO: Получить схему для категории
        """
        # TODO: Получить категорию по slug
        # TODO: Вернуть схему категории
        pass
```

### Задача 5.3: Создать FormSchemaSerializer

**Файл:** `maps/serializers.py`

```python
# TODO: Добавить в maps/serializers.py

class FormSchemaSerializer(serializers.ModelSerializer):
    """
    Serializer для схемы формы
    """
    category_slug = serializers.SlugRelatedField(
        source='category',
        queryset=POICategory.objects.all(),
        slug_field='slug',
        write_only=True
    )
    
    class Meta:
        model = FormSchema
        fields = [
            'uuid', 'category', 'category_slug', 'name',
            'schema_json', 'version', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['uuid', 'created_at', 'updated_at']
    
    def validate_schema_json(self, value):
        """
        TODO: Валидировать структуру schema_json
        """
        # TODO: Использовать FormSchema.validate_schema()
        pass
```

---

## 🎯 ЭТАП 6: Модерация с LLM (опционально)

### Задача 6.1: Создать сервис модерации через LLM

**Файл:** `maps/services/llm_moderation_service.py`

```python
"""
TODO: Создать сервис для модерации заявок через LLM

Сервис должен:
1. Анализировать заявку на создание места
2. Проверять качество данных
3. Оценивать влияние на здоровье
4. Возвращать вердикт (approve/reject/review)
"""

from maps.models import POI
from maps.services.llm_service import LLMService
from typing import Dict, Any

class LLMModerationService:
    """
    Сервис модерации заявок через LLM
    """
    
    def __init__(self):
        """
        TODO: Инициализация с LLM сервисом
        """
        self.llm_service = LLMService()
    
    def check_submission(self, poi: POI) -> Dict[str, Any]:
        """
        TODO: Проверить заявку через LLM
        
        Args:
            poi: Объект POI для проверки
            
        Returns:
            dict: {
                "verdict": "approve|reject|review",
                "confidence": 0.0-1.0,
                "comment": "Текст комментария",
                "analysis": {
                    "field_quality": "good|medium|poor",
                    "health_impact": "positive|neutral|negative",
                    "data_completeness": 0.0-1.0
                }
            }
        """
        # TODO: Реализовать проверку:
        # 1. Сформировать промпт для LLM с данными POI
        # 2. Отправить запрос в LLM
        # 3. Парсить ответ LLM
        # 4. Вернуть структурированный результат
        pass
    
    def generate_prompt(self, poi: POI) -> str:
        """
        TODO: Сгенерировать промпт для LLM
        
        Args:
            poi: Объект POI
            
        Returns:
            str: Промпт для LLM
        """
        # TODO: Сформировать промпт с:
        # - Названием места
        # - Категорией
        # - Заполненными полями формы
        # - Адресом
        # - Запросить анализ влияния на здоровье
        pass
```

### Задача 6.2: Интегрировать LLM в процесс модерации

**Файл:** `maps/views.py` (в POISubmissionViewSet)

```python
# TODO: Обновить perform_create в POISubmissionViewSet

def perform_create(self, serializer):
    """
    TODO: Создать заявку и отправить на проверку LLM (асинхронно)
    """
    # TODO: Сохранить заявку
    # TODO: Отправить задачу в Celery для проверки LLM
    # TODO: Или проверить синхронно (если быстро)
    pass
```

---

## 🎯 ЭТАП 7: Метрика начального рейтинга

### Задача 7.1: Обновить InfrastructureScoreCalculator

**Файл:** `maps/services/infrastructure_score_calculator.py`

```python
# TODO: Обновить метод calculate_infra_score

def calculate_infra_score(self, poi):
    """
    TODO: Рассчитать инфраструктурный рейтинг на основе form_data
    
    Args:
        poi: Объект POI с заполненным form_data
        
    Returns:
        float: S_infra в диапазоне 0-100
    """
    # TODO: Реализовать расчет:
    # 1. Получить FormSchema категории
    # 2. Получить form_data из POI
    # 3. Для каждого поля в схеме:
    #    - Получить значение из form_data
    #    - Нормализовать значение (через FieldValueNormalizer)
    #    - Применить direction (если -1, инвертировать)
    #    - Умножить на weight
    # 4. Рассчитать взвешенную сумму
    # 5. Нормализовать в диапазон 0-100
    pass
```

### Задача 7.2: Создать нормализатор значений полей

**Файл:** `maps/services/field_value_normalizer.py`

```python
"""
TODO: Создать сервис для нормализации значений полей формы

Сервис должен нормализовать значения разных типов полей в диапазон 0-1
"""

from typing import Any, Dict

class FieldValueNormalizer:
    """
    Нормализатор значений полей формы
    """
    
    def normalize(self, field: Dict, value: Any) -> float:
        """
        TODO: Нормализовать значение поля в диапазон 0-1
        
        Args:
            field: Определение поля из схемы
            value: Значение поля
            
        Returns:
            float: Нормализованное значение (0-1)
        """
        field_type = field.get('type')
        
        if field_type == 'boolean':
            # TODO: true -> 1.0, false -> 0.0
            pass
        
        elif field_type == 'range':
            # TODO: (value - min) / (max - min)
            pass
        
        elif field_type == 'select':
            # TODO: Использовать mapping или индекс опции
            pass
        
        elif field_type == 'text':
            # TODO: Проверить наличие текста (есть -> 1.0, нет -> 0.0)
            pass
        
        elif field_type == 'photo':
            # TODO: Есть фото -> 1.0, нет -> 0.0
            pass
        
        return 0.0  # По умолчанию
```

### Задача 7.3: Интегрировать расчет в процесс создания

**Файл:** `maps/signals.py`

```python
# TODO: Добавить сигнал для автоматического расчета рейтинга

from django.db.models.signals import post_save
from django.dispatch import receiver
from maps.models import POI
from maps.services.health_impact_score_calculator import HealthImpactScoreCalculator

@receiver(post_save, sender=POI)
def calculate_initial_rating(sender, instance, created, **kwargs):
    """
    TODO: Автоматически рассчитать начальный рейтинг при создании/обновлении POI
    
    Условия:
    - POI должен иметь form_data
    - POI должен иметь form_schema
    - Статус модерации должен быть approved
    """
    # TODO: Проверить условия
    # TODO: Рассчитать S_infra через InfrastructureScoreCalculator
    # TODO: Сохранить в POIRating
    pass
```

---

## 📝 Дополнительные задачи

### Задача: Создать тесты

**Файлы:**
- `maps/tests/test_poi_submission.py` - тесты для заявок
- `maps/tests/test_excel_parser.py` - тесты для парсера Excel
- `maps/tests/test_form_validator.py` - тесты для валидатора
- `maps/tests/test_initial_rating.py` - тесты для расчета рейтинга

### Задача: Создать админку

**Файл:** `maps/admin.py`

```python
# TODO: Добавить в админку:
# - POISubmission (для просмотра заявок)
# - Форму для модерации
# - Фильтры по статусу модерации
```

---

## ✅ Чек-лист реализации

### Этап 1: Очистка БД
- [ ] Создан скрипт cleanup_database.py
- [ ] Обновлена модель POI (поля модерации)
- [ ] Создана и применена миграция

### Этап 2: Категории из Excel
- [ ] Создан ExcelCategoryAnalyzer
- [ ] Создана команда import_categories_from_excel
- [ ] Определены поля для каждой категории
- [ ] Созданы категории и схемы

### Этап 3: Ручное создание
- [ ] Создан FormValidator
- [ ] Создан POISubmissionSerializer
- [ ] Создан POISubmissionViewSet
- [ ] Добавлены URLs
- [ ] Протестировано создание заявки

### Этап 4: Массовая загрузка
- [ ] Создан ExcelParser
- [ ] Создан BulkUploadView
- [ ] Протестирована загрузка Excel

### Этап 5: Редактор категорий
- [ ] Обновлен POICategoryViewSet
- [ ] Создан FormSchemaViewSet
- [ ] Создан FormSchemaSerializer
- [ ] Протестировано создание/редактирование

### Этап 6: LLM модерация (опционально)
- [ ] Создан LLMModerationService
- [ ] Интегрирован в процесс создания
- [ ] Протестирована проверка через LLM

### Этап 7: Метрика рейтинга
- [ ] Обновлен InfrastructureScoreCalculator
- [ ] Создан FieldValueNormalizer
- [ ] Добавлен сигнал для автоматического расчета
- [ ] Протестирован расчет рейтинга

---

## 🔗 Связанные файлы

- `ARCHITECTURE_PLACES_SYSTEM.md` - архитектурный план
- `FRONTEND_TASK_PLACES.md` - ТЗ для фронтендера
- `maps/models.py` - модели данных
- `maps/services/` - сервисы
