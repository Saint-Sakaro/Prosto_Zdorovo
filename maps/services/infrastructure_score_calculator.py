"""
Сервис расчета статического инфраструктурного рейтинга (S_infra)

Реализует расчет рейтинга через Gigachat на основе описания места.
"""

from maps.models import POI
from maps.services.llm_service import LLMService
import logging

logger = logging.getLogger(__name__)


class InfrastructureScoreCalculator:
    """
    Класс для расчета инфраструктурного рейтинга через Gigachat
    
    Методы:
    - calculate_infra_score(): Расчет S_infra для объекта через Gigachat
    - calculate_from_description(): Расчет S_infra напрямую из описания
    """
    
    def __init__(self):
        """Инициализация с LLM сервисом"""
        self.llm_service = LLMService()
    
    def calculate_infra_score(self, poi):
        """
        Рассчитывает инфраструктурный рейтинг для объекта через Gigachat
        
        Args:
            poi: Объект POI с описанием
        
        Returns:
            float: S_infra в диапазоне 0-100
        """
        # Используем описание места
        description = poi.description or ''
        
        # Если описания нет, пытаемся сформировать из form_data (для обратной совместимости)
        if not description and poi.form_data:
            description = self._format_description_from_form_data(poi.form_data)
        
        # Если всё ещё нет описания, возвращаем нейтральное значение
        if not description or not description.strip():
            logger.warning(f'No description for POI {poi.uuid}, returning neutral score')
            return 50.0
        
        # Получаем название категории
        category_name = poi.category.name if poi.category else 'Неизвестная категория'
        
        # Формируем дополнительные данные
        additional_data = {
            'адрес': poi.address,
            'название': poi.name,
        }
        
        # Вызываем Gigachat для расчета
        result = self.llm_service.calculate_infra_score(
            description=description,
            category_name=category_name,
            additional_data=additional_data
        )
        
        s_infra = result.get('s_infra', 50.0)
        
        # Сохраняем метаданные расчета в POI (если есть)
        if hasattr(poi, 'metadata'):
            poi.metadata = poi.metadata or {}
            poi.metadata['s_infra_calculation'] = {
                'confidence': result.get('confidence', 0.0),
                'reasoning': result.get('reasoning', ''),
                'red_flags': result.get('red_flags', []),
                'calculated_by': 'gigachat'
            }
        
        return s_infra
    
    def calculate_from_description(self, description: str, category_name: str, additional_data: dict = None) -> dict:
        """
        Рассчитывает S_infra напрямую из описания
        
        Args:
            description: Описание места
            category_name: Название категории
            additional_data: Дополнительные данные (опционально)
        
        Returns:
            dict: {
                's_infra': float,
                'confidence': float,
                'reasoning': str,
                'red_flags': list
            }
        """
        return self.llm_service.calculate_infra_score(
            description=description,
            category_name=category_name,
            additional_data=additional_data or {}
        )
    
    def _format_description_from_form_data(self, form_data: dict) -> str:
        """
        Форматирует описание из form_data для обратной совместимости
        
        Args:
            form_data: Данные формы
        
        Returns:
            str: Форматированное описание
        """
        parts = []
        for key, value in form_data.items():
            if value:
                parts.append(f"{key}: {value}")
        
        return ". ".join(parts) if parts else ""

