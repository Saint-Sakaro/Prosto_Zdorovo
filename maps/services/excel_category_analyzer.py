"""
Сервис для анализа Excel файла и определения категорий

Сервис должен:
1. Парсить Excel файл
2. Определять категории по названиям листов
3. Анализировать колонки и определять типы данных
4. Генерировать предложения для FormSchema
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import re
import logging

logger = logging.getLogger(__name__)


class ExcelCategoryAnalyzer:
    """
    Анализатор Excel файла для определения категорий и полей
    """
    
    def __init__(self, excel_path: str):
        """
        Инициализация с путем к Excel файлу
        
        Args:
            excel_path: Путь к Excel файлу
        """
        self.excel_path = excel_path
        try:
            self.excel_file = pd.ExcelFile(excel_path, engine='openpyxl')
        except Exception as e:
            logger.error(f"Ошибка при загрузке Excel файла: {e}")
            raise
    
    def get_all_sheets(self) -> List[str]:
        """
        Получить список всех листов в Excel файле
        
        Returns:
            list: Список названий листов
        """
        return self.excel_file.sheet_names
    
    def _detect_column_type(self, series: pd.Series) -> str:
        """
        Определить тип данных колонки
        
        Args:
            series: Series pandas с данными колонки
            
        Returns:
            str: Тип данных ('text', 'number', 'boolean', 'date', 'coordinate')
        """
        # Удаляем NaN значения
        non_null = series.dropna()
        
        if len(non_null) == 0:
            return 'text'
        
        # Проверяем на координаты (широта/долгота)
        sample_values = non_null.head(10).astype(str).str.lower()
        if any(re.match(r'^-?\d+\.?\d*$', str(v)) for v in sample_values):
            numeric_values = pd.to_numeric(non_null, errors='coerce').dropna()
            if len(numeric_values) > 0:
                min_val = numeric_values.min()
                max_val = numeric_values.max()
                # Координаты обычно в диапазонах -180 до 180 (долгота) или -90 до 90 (широта)
                if (-180 <= min_val <= 180 and -90 <= max_val <= 90):
                    if abs(max_val) <= 90 and abs(min_val) <= 90:
                        return 'coordinate'
        
        # Проверяем на числа
        try:
            numeric = pd.to_numeric(non_null, errors='coerce')
            if numeric.notna().sum() / len(non_null) > 0.8:  # 80% значений - числа
                return 'number'
        except:
            pass
        
        # Проверяем на boolean
        bool_values = non_null.astype(str).str.lower().str.strip()
        bool_keywords = ['да', 'нет', 'yes', 'no', 'true', 'false', '1', '0', 'есть', 'нет']
        if bool_values.isin(bool_keywords).sum() / len(non_null) > 0.8:
            return 'boolean'
        
        # Проверяем на дату
        try:
            dates = pd.to_datetime(non_null, errors='coerce')
            if dates.notna().sum() / len(non_null) > 0.7:  # 70% значений - даты
                return 'date'
        except:
            pass
        
        # По умолчанию - текст
        return 'text'
    
    def _suggest_field_type(self, column_name: str, column_type: str, sample_values: List[Any]) -> Dict[str, Any]:
        """
        Предложить тип поля формы на основе анализа колонки
        
        Args:
            column_name: Название колонки
            column_type: Тип данных колонки
            sample_values: Примеры значений
            
        Returns:
            dict: Предложение для поля формы
        """
        column_lower = column_name.lower()
        unique_values = list(set(str(v).strip() for v in sample_values if pd.notna(v)))[:10]
        unique_count = len(unique_values)
        
        # Определяем базовые параметры
        field_id = re.sub(r'[^a-zA-Z0-9_]', '_', column_name.lower())
        label = column_name.strip()
        
        # Определяем направление (1 = положительное влияние, -1 = отрицательное)
        direction = 1
        negative_keywords = ['нет', 'отсутствует', 'не', 'отказ', 'запрещено', 'запрет']
        if any(keyword in column_lower for keyword in negative_keywords):
            direction = -1
        
        # Определяем тип поля
        if column_type == 'boolean':
            return {
                'id': field_id,
                'type': 'boolean',
                'label': label,
                'weight': 0.2,
                'direction': direction,
            }
        
        elif column_type == 'number':
            # Определяем, может ли это быть range
            try:
                numeric_values = [float(v) for v in sample_values if pd.notna(v)]
                if numeric_values:
                    min_val = min(numeric_values)
                    max_val = max(numeric_values)
                    # Если значения в разумном диапазоне - предлагаем range
                    if max_val - min_val > 1 and max_val <= 1000:
                        return {
                            'id': field_id,
                            'type': 'range',
                            'label': label,
                            'weight': 0.3,
                            'direction': direction,
                            'scale_min': float(min_val),
                            'scale_max': float(max_val),
                        }
            except:
                pass
        
        # Если немного уникальных значений (до 10) - предлагаем select
        if unique_count <= 10 and unique_count >= 2:
            return {
                'id': field_id,
                'type': 'select',
                'label': label,
                'weight': 0.3,
                'direction': direction,
                'options': unique_values[:10],
            }
        
        # По умолчанию - text (или boolean для координат)
        if column_type == 'coordinate':
            # Координаты не включаем в форму (они в отдельных полях)
            return None
        
        return {
            'id': field_id,
            'type': 'text',
            'label': label,
            'weight': 0.1,
            'direction': direction,
        }
    
    def analyze_sheet(self, sheet_name: str) -> Dict[str, Any]:
        """
        Проанализировать лист Excel
        
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
        try:
            df = pd.read_excel(self.excel_path, sheet_name=sheet_name, engine='openpyxl')
        except Exception as e:
            logger.error(f"Ошибка при чтении листа {sheet_name}: {e}")
            return {
                'category_name': sheet_name,
                'columns': [],
                'row_count': 0,
                'error': str(e)
            }
        
        # Анализируем колонки
        columns_info = []
        
        for col_name in df.columns:
            col_series = df[col_name]
            column_type = self._detect_column_type(col_series)
            
            # Получаем примеры значений (первые 10 непустых)
            sample_values = col_series.dropna().head(10).tolist()
            nullable = col_series.isna().sum() > 0
            
            # Предлагаем тип поля формы
            suggested_field = self._suggest_field_type(
                str(col_name),
                column_type,
                sample_values
            )
            
            column_info = {
                'name': str(col_name),
                'type': column_type,
                'sample_values': [str(v) for v in sample_values[:5]],
                'nullable': nullable,
            }
            
            if suggested_field:
                column_info['suggested_field'] = suggested_field
            
            columns_info.append(column_info)
        
        return {
            'category_name': sheet_name,
            'columns': columns_info,
            'row_count': len(df),
        }
    
    def suggest_form_schema(self, sheet_name: str) -> Dict[str, Any]:
        """
        Предложить схему формы на основе анализа листа
        
        Args:
            sheet_name: Название листа
            
        Returns:
            dict: Структура FormSchema.schema_json
        """
        analysis = self.analyze_sheet(sheet_name)
        
        if 'error' in analysis:
            return {'fields': [], 'error': analysis['error']}
        
        fields = []
        for col_info in analysis['columns']:
            if 'suggested_field' in col_info:
                field = col_info['suggested_field'].copy()
                # Убираем опции из select, если их слишком много
                if field.get('type') == 'select' and len(field.get('options', [])) > 10:
                    field['type'] = 'text'
                    field.pop('options', None)
                fields.append(field)
        
        # Нормализуем веса (сумма весов должна быть разумной)
        total_weight = sum(f.get('weight', 0) for f in fields)
        if total_weight > 0:
            # Нормализуем до суммы ~1.0
            scale = 1.0 / total_weight
            for field in fields:
                field['weight'] = round(field['weight'] * scale, 2)
        
        return {
            'fields': fields,
            'version': '1.0',
        }

