"""
Админ-панель Django для модуля карт

Настройка интерфейса администратора для:
- Управления категориями POI
- Управления точками интереса (POI)
- Просмотра рейтингов
- Управления анализами областей
"""

from django.contrib import admin
from maps.models import POI, POICategory, POIRating, AreaAnalysis


@admin.register(POICategory)
class POICategoryAdmin(admin.ModelAdmin):
    """
    Админ-панель для категорий POI
    """
    list_display = [
        'name', 'slug', 'health_weight', 'health_importance',
        'display_order', 'is_active', 'created_at'
    ]
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'slug', 'description']
    readonly_fields = ['uuid', 'created_at', 'updated_at']
    prepopulated_fields = {'slug': ('name',)}
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('uuid', 'name', 'slug', 'description', 'icon')
        }),
        ('Визуализация', {
            'fields': ('marker_color', 'display_order')
        }),
        ('Расчет индекса здоровья', {
            'fields': ('health_weight', 'health_importance')
        }),
        ('Статус', {
            'fields': ('is_active',)
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at')
        }),
    )


class POIRatingInline(admin.StackedInline):
    """
    Inline для рейтинга POI
    """
    model = POIRating
    extra = 0
    readonly_fields = ['uuid', 'last_calculated_at', 'created_at', 'updated_at']


@admin.register(POI)
class POIAdmin(admin.ModelAdmin):
    """
    Админ-панель для точек интереса
    """
    list_display = [
        'name', 'category', 'address', 'latitude', 'longitude',
        'is_active', 'is_geocoded', 'created_at'
    ]
    list_filter = ['category', 'is_active', 'is_geocoded', 'created_at']
    search_fields = ['name', 'address', 'description']
    readonly_fields = ['uuid', 'is_geocoded', 'geocoded_at', 'created_at', 'updated_at']
    inlines = [POIRatingInline]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('uuid', 'name', 'category', 'address')
        }),
        ('Географические данные', {
            'fields': ('latitude', 'longitude', 'is_geocoded', 'geocoded_at')
        }),
        ('Описание', {
            'fields': ('description',)
        }),
        ('Контактная информация', {
            'fields': ('phone', 'website', 'email', 'working_hours')
        }),
        ('Дополнительно', {
            'fields': ('metadata', 'is_active')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    actions = ['geocode_addresses']
    
    def geocode_addresses(self, request, queryset):
        """
        Массовое геокодирование адресов
        
        Геокодирует адреса через Яндекс Geocoder API
        """
        from maps.services.geocoder_service import GeocoderService
        
        geocoder = GeocoderService()
        
        if not geocoder.api_key:
            self.message_user(
                request,
                'Ошибка: YANDEX_GEOCODER_API_KEY не настроен в settings.py',
                level='ERROR'
            )
            return
        
        pois_to_geocode = queryset.filter(is_geocoded=False)
        count = 0
        errors = 0
        
        for poi in pois_to_geocode:
            try:
                if geocoder.geocode_poi(poi):
                    count += 1
                else:
                    errors += 1
            except Exception as e:
                errors += 1
                self.message_user(
                    request,
                    f'Ошибка при геокодировании {poi.name}: {str(e)}',
                    level='ERROR'
                )
        
        if count > 0:
            self.message_user(
                request,
                f'Геокодировано объектов: {count} из {pois_to_geocode.count()}'
            )
        if errors > 0:
            self.message_user(
                request,
                f'Ошибок при геокодировании: {errors}',
                level='WARNING'
            )
    
    geocode_addresses.short_description = "Геокодировать адреса выбранных объектов"


@admin.register(POIRating)
class POIRatingAdmin(admin.ModelAdmin):
    """
    Админ-панель для рейтингов POI
    """
    list_display = [
        'poi', 'health_score', 'reviews_count',
        'approved_reviews_count', 'average_user_rating', 'last_calculated_at'
    ]
    list_filter = ['last_calculated_at']
    search_fields = ['poi__name', 'poi__address']
    readonly_fields = ['uuid', 'last_calculated_at', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Рейтинг', {
            'fields': ('uuid', 'poi', 'health_score', 'calculation_method')
        }),
        ('Статистика отзывов', {
            'fields': ('reviews_count', 'approved_reviews_count', 'average_user_rating')
        }),
        ('Метрики', {
            'fields': ('metrics',)
        }),
        ('Даты', {
            'fields': ('last_calculated_at', 'created_at', 'updated_at')
        }),
    )
    
    actions = ['recalculate_ratings']
    
    def recalculate_ratings(self, request, queryset):
        """
        Пересчет рейтингов выбранных объектов
        
        Пересчитывает рейтинги на основе отзывов из модуля геймификации
        """
        from maps.signals import recalculate_poi_rating
        
        count = 0
        for rating in queryset:
            try:
                recalculate_poi_rating(rating.poi)
                count += 1
            except Exception as e:
                self.message_user(
                    request,
                    f'Ошибка при пересчете рейтинга для {rating.poi.name}: {str(e)}',
                    level='ERROR'
                )
        
        self.message_user(request, f'Пересчитано рейтингов: {count} из {queryset.count()}')
    
    recalculate_ratings.short_description = "Пересчитать рейтинги"


@admin.register(AreaAnalysis)
class AreaAnalysisAdmin(admin.ModelAdmin):
    """
    Админ-панель для истории анализов областей
    """
    list_display = [
        'analysis_type', 'health_index', 'objects_count',
        'area_name', 'user', 'created_at'
    ]
    list_filter = ['analysis_type', 'created_at']
    search_fields = ['area_name', 'user__username']
    readonly_fields = ['uuid', 'created_at']
    
    fieldsets = (
        ('Анализ', {
            'fields': ('uuid', 'analysis_type', 'area_params', 'active_filters')
        }),
        ('Результаты', {
            'fields': ('health_index', 'category_stats', 'objects_count', 'area_name')
        }),
        ('Пользователь', {
            'fields': ('user',)
        }),
        ('Даты', {
            'fields': ('created_at',)
        }),
    )

