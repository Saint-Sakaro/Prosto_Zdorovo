"""
Сервис для валидации данных формы на основе FormSchema

Сервис должен:
1. Проверять наличие обязательных полей
2. Проверять типы данных
3. Проверять диапазоны значений
4. Проверять соответствие значений опциям (для select)
"""

from maps.models import FormSchema
from typing import Dict, List, Tuple, Any, Optional
import logging

logger = logging.getLogger(__name__)


class FormValidator:
    """
    Валидатор данных формы на основе схемы
    """
    
    def __init__(self, form_schema: FormSchema):
        """
        Инициализация с FormSchema
        
        Args:
            form_schema: Схема формы для валидации
        """
        self.form_schema = form_schema
        self.schema_fields = form_schema.get_fields()
    
    def validate(self, form_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Валидировать данные формы
        
        Args:
            form_data: Словарь с данными формы
            
        Returns:
            tuple: (is_valid: bool, errors: List[str])
        """
        errors = []
        
        if not isinstance(form_data, dict):
            errors.append('form_data должен быть словарем')
            return False, errors
        
        # 1. Проверить обязательные поля
        for field in self.schema_fields:
            field_id = field.get('id')
            if not field_id:
                continue
            
            is_required = field.get('required', False)
            
            if is_required and field_id not in form_data:
                errors.append(f'Обязательное поле "{field.get("label", field_id)}" отсутствует')
                continue
            
            # 2. Валидировать поле, если оно присутствует
            if field_id in form_data:
                value = form_data[field_id]
                is_valid, error_msg = self.validate_field(field, value)
                if not is_valid:
                    errors.append(f'Поле "{field.get("label", field_id)}": {error_msg}')
        
        return len(errors) == 0, errors
    
    def validate_field(self, field: Dict, value: Any) -> Tuple[bool, str]:
        """
        Валидировать одно поле
        
        Args:
            field: Определение поля из схемы
            value: Значение поля
            
        Returns:
            tuple: (is_valid: bool, error_message: str)
        """
        field_type = field.get('type')
        field_id = field.get('id', 'unknown')
        
        # Проверка на None для обязательных полей
        if value is None:
            if field.get('required', False):
                return False, 'Значение не может быть пустым'
            return True, ''  # None допустимо для необязательных полей
        
        # Валидация по типу поля
        if field_type == 'boolean':
            if not isinstance(value, bool):
                # Пробуем преобразовать строковые значения
                if isinstance(value, str):
                    value_lower = value.lower().strip()
                    if value_lower in ['true', '1', 'yes', 'да', 'есть']:
                        return True, ''
                    elif value_lower in ['false', '0', 'no', 'нет']:
                        return True, ''
                    else:
                        return False, 'Должно быть булевым значением (true/false)'
                return False, 'Должно быть булевым значением'
            return True, ''
        
        elif field_type == 'range':
            try:
                num_value = float(value)
                scale_min = field.get('scale_min', 0)
                scale_max = field.get('scale_max', 100)
                
                if num_value < scale_min or num_value > scale_max:
                    return False, f'Значение должно быть в диапазоне от {scale_min} до {scale_max}'
                return True, ''
            except (ValueError, TypeError):
                return False, 'Должно быть числовым значением'
        
        elif field_type == 'select':
            # Проверяем опции
            options = field.get('options', [])
            if options:
                if str(value) not in [str(opt) for opt in options]:
                    return False, f'Значение должно быть одним из: {", ".join(map(str, options))}'
                return True, ''
            
            # Если есть mapping, проверяем ключи
            mapping = field.get('mapping', {})
            if mapping:
                if str(value) not in [str(k) for k in mapping.keys()]:
                    return False, f'Значение должно быть одним из: {", ".join(map(str, mapping.keys()))}'
                return True, ''
            
            # Если нет ни options, ни mapping - допустимо любое значение
            return True, ''
        
        elif field_type == 'text':
            if not isinstance(value, str):
                value = str(value)
            return True, ''
        
        elif field_type == 'photo':
            # Для фото можно передать URL или путь
            if isinstance(value, str):
                return True, ''
            elif isinstance(value, bool):
                # Boolean для наличия/отсутствия фото
                return True, ''
            else:
                return False, 'Должно быть строкой (URL или путь) или булевым значением'
        
        # Неизвестный тип - разрешаем, но с предупреждением
        logger.warning(f'Неизвестный тип поля {field_type} для поля {field_id}')
        return True, ''

