"""
Сервис фильтрации POI по категориям

Реализует логику фильтрации объектов на карте
по типам/категориям для визуализации и анализа.
"""

from maps.models import POI, POICategory


class POIFilterService:
    """
    Класс для фильтрации POI
    
    Методы:
    - get_filtered_pois(): Получить отфильтрованные POI
    - get_all_categories(): Получить все категории
    - validate_filters(): Валидация фильтров
    """
    
    def get_filtered_pois(self, category_uuids=None, bbox=None):
        """
        Получить POI с применением фильтров
        
        Показывает только активные и одобренные места (прошедшие модерацию).
        
        Args:
            category_uuids: Список UUID категорий для фильтрации (None = все)
            bbox: Bounding box для ограничения области (опционально)
                Формат: {'sw_lat': float, 'sw_lon': float, 'ne_lat': float, 'ne_lon': float}
        
        Returns:
            QuerySet: Отфильтрованные POI
        """
        # Показываем только активные и одобренные места
        pois = POI.objects.filter(is_active=True, moderation_status='approved')
        
        # Фильтр по категориям
        if category_uuids:
            pois = pois.filter(category__uuid__in=category_uuids)
        
        # Фильтр по bounding box
        if bbox:
            pois = pois.filter(
                latitude__gte=bbox['sw_lat'],
                latitude__lte=bbox['ne_lat'],
                longitude__gte=bbox['sw_lon'],
                longitude__lte=bbox['ne_lon']
            )
        
        return pois.select_related('category', 'rating')
    
    def get_all_categories(self, active_only=True):
        """
        Получить все категории POI
        
        Args:
            active_only: Только активные категории
        
        Returns:
            QuerySet: Категории
        """
        categories = POICategory.objects.all()
        if active_only:
            categories = categories.filter(is_active=True)
        
        return categories.order_by('display_order', 'name')
    
    def validate_filters(self, category_uuids):
        """
        Валидировать список фильтров категорий
        
        Args:
            category_uuids: Список UUID категорий
        
        Returns:
            tuple: (is_valid: bool, valid_uuids: list, invalid_uuids: list)
        """
        if not category_uuids:
            return True, [], []
        
        existing_uuids = set(
            str(uuid) for uuid in POICategory.objects.filter(is_active=True).values_list('uuid', flat=True)
        )
        
        valid_uuids = [uuid for uuid in category_uuids if str(uuid) in existing_uuids]
        invalid_uuids = [uuid for uuid in category_uuids if str(uuid) not in existing_uuids]
        
        is_valid = len(invalid_uuids) == 0
        
        return is_valid, valid_uuids, invalid_uuids

