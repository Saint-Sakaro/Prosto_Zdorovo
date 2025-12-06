"""
Сервис расчета индекса "здоровости" области

Реализует алгоритмы расчета интегрального индекса "здоровости"
на основе рейтингов объектов в области.
"""

from django.db.models import Avg, Sum, Count
from maps.models import POI, POIRating, POICategory


class HealthIndexCalculator:
    """
    Класс для расчета индекса "здоровости" области
    
    Методы:
    - calculate_area_index(): Расчет интегрального индекса для области
    - calculate_weighted_average(): Средневзвешенное значение
    - get_object_weight(): Получение веса объекта при расчете
    """
    
    def calculate_area_index(self, pois):
        """
        Рассчитывает интегральный индекс "здоровости" для области
        
        Args:
            pois: QuerySet POI в области
        
        Returns:
            float: Индекс здоровья в диапазоне 0-100
        """
        if not pois.exists():
            return 50.0  # Нейтральное значение при отсутствии данных
        
        total_weighted_score = 0.0
        total_weight = 0.0
        
        for poi in pois.select_related('category', 'rating'):
            if not poi.rating:
                continue
            
            # Базовый рейтинг объекта
            health_score = poi.rating.health_score
            
            # Вес категории
            category_weight = poi.category.health_weight
            
            # Важность категории (нормализованная 0-1)
            importance_factor = poi.category.health_importance / 10.0
            
            # Фактор надежности (больше отзывов = более надежная оценка)
            reliability_factor = min(1.0, poi.rating.approved_reviews_count / 10.0)
            if reliability_factor < 0.1:
                reliability_factor = 0.1  # Минимальная надежность
            
            # Итоговый вес объекта
            object_weight = category_weight * importance_factor * reliability_factor
            
            # Взвешенный вклад объекта
            total_weighted_score += health_score * object_weight
            total_weight += object_weight
        
        # Рассчитываем средневзвешенное значение
        if total_weight > 0:
            index = total_weighted_score / total_weight
        else:
            index = 50.0
        
        # Нормализуем в диапазон 0-100
        index = max(0.0, min(100.0, index))
        
        return round(index, 2)
    
    def calculate_weighted_average(self, pois, weight_field='health_weight'):
        """
        Рассчитывает средневзвешенное значение рейтингов
        
        Args:
            pois: QuerySet POI
            weight_field: Поле для веса (по умолчанию health_weight категории)
        
        Returns:
            float: Средневзвешенное значение
        """
        if not pois.exists():
            return 50.0
        
        total_weighted_score = 0.0
        total_weight = 0.0
        
        for poi in pois.select_related('category', 'rating'):
            if not poi.rating:
                continue
            
            health_score = poi.rating.health_score
            weight = getattr(poi.category, weight_field, 1.0)
            
            total_weighted_score += health_score * weight
            total_weight += weight
        
        if total_weight > 0:
            return round(total_weighted_score / total_weight, 2)
        return 50.0
    
    def get_object_weight(self, poi, distance_to_center=None):
        """
        Получить вес объекта при расчете индекса
        
        Args:
            poi: Объект POI
            distance_to_center: Расстояние до центра области (опционально)
        
        Returns:
            float: Вес объекта
        """
        if not poi.rating:
            return 0.0
        
        # Базовый вес категории
        base_weight = poi.category.health_weight
        
        # Фактор важности
        importance_factor = poi.category.health_importance / 10.0
        
        # Фактор надежности (количество отзывов)
        reliability_factor = min(1.0, poi.rating.approved_reviews_count / 10.0)
        if reliability_factor < 0.1:
            reliability_factor = 0.1
        
        # Фактор расстояния (если указано)
        distance_factor = 1.0
        if distance_to_center is not None:
            # Ближе к центру = больше вес (можно использовать обратную пропорцию)
            # Например: weight = 1 / (1 + distance / 1000)
            distance_factor = 1.0 / (1.0 + distance_to_center / 1000.0)
        
        # Итоговый вес
        weight = base_weight * importance_factor * reliability_factor * distance_factor
        
        return weight
    
    def interpret_health_index(self, index):
        """
        Интерпретирует индекс здоровья в текстовое описание
        
        Args:
            index: Числовой индекс (0-100)
        
        Returns:
            str: Текстовое описание (например, "благополучная зона")
        """
        if index >= 81:
            return "Отличная зона"
        elif index >= 61:
            return "Благополучная зона"
        elif index >= 31:
            return "Средняя зона"
        else:
            return "Неблагоприятная зона"

