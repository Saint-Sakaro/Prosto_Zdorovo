"""
Сервис расчета статического инфраструктурного рейтинга (S_infra)

Реализует расчет рейтинга на основе заполненной анкеты объекта
с учетом весов полей и нормализации значений.
"""

from django.db.models import Q
from maps.models import POI, FormSchema
from decimal import Decimal


class InfrastructureScoreCalculator:
    """
    Класс для расчета инфраструктурного рейтинга
    
    Методы:
    - calculate_infra_score(): Расчет S_infra для объекта
    - normalize_field_value(): Нормализация значения поля в [0;1]
    - calculate_weighted_sum(): Расчет взвешенной суммы
    """
    
    def calculate_infra_score(self, poi):
        """
        Рассчитывает инфраструктурный рейтинг для объекта
        
        Args:
            poi: Объект POI с заполненной анкетой
        
        Returns:
            float: S_infra в диапазоне 0-100
        """
        if not poi.form_schema or not poi.form_data:
            return 50.0  # Нейтральное значение при отсутствии данных
        
        schema = poi.form_schema
        form_data = poi.form_data
        fields = schema.get_fields()
        
        if not fields:
            return 50.0
        
        total_weighted_score = 0.0
        total_weight = 0.0
        
        for field in fields:
            field_id = field.get('id')
            if not field_id or field_id not in form_data:
                continue  # Пропускаем незаполненные поля
            
            # Нормализуем значение поля (direction уже учтен в normalize_field_value)
            normalized_value = self.normalize_field_value(
                field,
                form_data[field_id]
            )
            
            # Получаем вес
            weight = field.get('weight', 1.0)
            
            # Взвешенный вклад поля
            total_weighted_score += normalized_value * weight
            total_weight += abs(weight)
        
        # Рассчитываем средневзвешенное значение
        if total_weight > 0:
            raw_score = total_weighted_score / total_weight
        else:
            raw_score = 0.5  # Нейтральное значение
        
        # Нормализуем в диапазон 0-100
        S_infra = max(0.0, min(100.0, raw_score * 100.0))
        
        return round(S_infra, 2)
    
    def normalize_field_value(self, field, value):
        """
        Нормализует значение поля в диапазон [0;1]
        
        Args:
            field: Словарь с описанием поля из схемы
            value: Фактическое значение поля
        
        Returns:
            float: Нормализованное значение в [0;1]
        """
        field_type = field.get('type')
        direction = field.get('direction', 1)
        
        if field_type == 'boolean':
            # Boolean поле
            bool_value = bool(value)
            if direction == 1:
                return 1.0 if bool_value else 0.0
            else:
                return 0.0 if bool_value else 1.0
        
        elif field_type == 'range':
            # Числовой диапазон
            try:
                num_value = float(value)
                scale_min = field.get('scale_min', 0.0)
                scale_max = field.get('scale_max', 1.0)
                
                if scale_max == scale_min:
                    normalized = 0.5  # Избегаем деления на ноль
                else:
                    normalized = (num_value - scale_min) / (scale_max - scale_min)
                    normalized = max(0.0, min(1.0, normalized))  # Ограничиваем [0;1]
                
                if direction == -1:
                    normalized = 1.0 - normalized
                
                return normalized
            except (ValueError, TypeError):
                return 0.0
        
        elif field_type == 'select':
            # Выбор из списка
            mapping = field.get('mapping', {})
            return mapping.get(str(value), mapping.get(value, 0.0))
        
        elif field_type == 'photo':
            # Наличие фото
            return 1.0 if value else 0.0
        
        # Неизвестный тип - возвращаем 0
        return 0.0
    
    def calculate_weighted_sum(self, normalized_values, weights):
        """
        Рассчитывает взвешенную сумму нормализованных значений
        
        Args:
            normalized_values: Список нормализованных значений [0;1]
            weights: Список весов
        
        Returns:
            float: Взвешенная сумма
        """
        if not normalized_values or not weights:
            return 0.5
        
        if len(normalized_values) != len(weights):
            return 0.5
        
        weighted_sum = sum(v * w for v, w in zip(normalized_values, weights))
        total_weight = sum(abs(w) for w in weights)
        
        if total_weight > 0:
            return weighted_sum / total_weight
        
        return 0.5

