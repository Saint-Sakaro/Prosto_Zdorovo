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
    
    def get_filtered_pois(self, category_slugs=None, bbox=None):
        """
        Получить POI с применением фильтров
        
        Args:
            category_slugs: Список slug категорий для фильтрации (None = все)
            bbox: Bounding box для ограничения области (опционально)
                Формат: {'sw_lat': float, 'sw_lon': float, 'ne_lat': float, 'ne_lon': float}
        
        Returns:
            QuerySet: Отфильтрованные POI
        """
        pois = POI.objects.filter(is_active=True)
        
        # Фильтр по категориям
        if category_slugs:
            pois = pois.filter(category__slug__in=category_slugs)
        
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
    
    def validate_filters(self, category_slugs):
        """
        Валидировать список фильтров категорий
        
        Args:
            category_slugs: Список slug категорий
        
        Returns:
            tuple: (is_valid: bool, valid_slugs: list, invalid_slugs: list)
        """
        if not category_slugs:
            return True, [], []
        
        existing_slugs = set(
            POICategory.objects.filter(is_active=True).values_list('slug', flat=True)
        )
        
        valid_slugs = [slug for slug in category_slugs if slug in existing_slugs]
        invalid_slugs = [slug for slug in category_slugs if slug not in existing_slugs]
        
        is_valid = len(invalid_slugs) == 0
        
        return is_valid, valid_slugs, invalid_slugs

