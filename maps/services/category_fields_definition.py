"""
Определение стандартных полей для каждой категории из Excel

Для каждой категории нужно определить:
- Какие поля обязательны
- Какие поля опциональны
- Типы полей (boolean, range, select, text)
- Веса полей
- Направления полей (1 = положительное влияние, -1 = отрицательное)
"""

from typing import List, Dict, Any
from maps.models import POICategory, FormSchema
import uuid


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


def create_form_schema_for_category(category: POICategory, fields_definition: List[Dict]) -> FormSchema:
    """
    Создать FormSchema для категории на основе определения полей
    
    Args:
        category: Объект POICategory
        fields_definition: Список определений полей
        
    Returns:
        FormSchema: Созданная схема
    """
    # Формируем schema_json
    schema_json = {
        'fields': []
    }
    
    for field_def in fields_definition:
        field = {
            'id': field_def['id'],
            'type': field_def['type'],
            'label': field_def['label'],
            'weight': field_def['weight'],
            'direction': field_def['direction'],
        }
        
        # Добавляем специфичные для типа поля
        if field_def['type'] == 'range':
            field['scale_min'] = field_def.get('scale_min', 0)
            field['scale_max'] = field_def.get('scale_max', 100)
        elif field_def['type'] == 'select':
            if 'options' in field_def:
                field['options'] = field_def['options']
            if 'mapping' in field_def:
                field['mapping'] = field_def['mapping']
        
        schema_json['fields'].append(field)
    
    # Создаем или обновляем FormSchema
    schema, created = FormSchema.objects.update_or_create(
        category=category,
        defaults={
            'name': f'Анкета для {category.name}',
            'schema_json': schema_json,
            'version': '1.0',
            'status': 'approved',
        }
    )
    
    return schema


def get_fields_for_category(category_name: str) -> List[Dict]:
    """
    Получить определение полей для категории по названию
    
    Args:
        category_name: Название категории
        
    Returns:
        list: Список определений полей или пустой список
    """
    return CATEGORY_FIELDS.get(category_name, [])

