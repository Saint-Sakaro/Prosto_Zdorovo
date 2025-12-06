"""
Сигналы Django для модуля карт

Используется для автоматической обработки событий:
- Обновление рейтинга POI при создании/модерации отзыва
- Создание рейтинга при создании POI
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from maps.models import POI, POIRating
from gamification.models import Review


@receiver(post_save, sender=POI)
def create_poi_rating(sender, instance, created, **kwargs):
    """
    Создает рейтинг при создании нового POI
    
    Args:
        sender: Модель POI
        instance: Экземпляр POI
        created: True если POI только что создан
        **kwargs: Дополнительные аргументы
    """
    if created:
        POIRating.objects.get_or_create(
            poi=instance,
            defaults={
                'health_score': 50.0,
                'reviews_count': 0,
                'approved_reviews_count': 0,
            }
        )


@receiver(post_save, sender=Review)
def update_poi_rating_on_review(sender, instance, **kwargs):
    """
    Обновляет рейтинг POI при изменении отзыва
    
    Вызывается когда:
    - Отзыв подтвержден (approved)
    - Отзыв отклонен (soft_reject, spam_blocked)
    
    Args:
        sender: Модель Review
        instance: Экземпляр Review
        **kwargs: Дополнительные аргументы
    """
    if instance.review_type == 'poi_review':
        # Поиск POI по координатам отзыва (в радиусе 50 метров)
        from geopy.distance import geodesic
        from maps.models import POI
        
        # Ищем ближайший POI к координатам отзыва
        pois = POI.objects.filter(is_active=True)
        closest_poi = None
        min_distance = float('inf')
        
        for poi in pois:
            distance = geodesic(
                (float(instance.latitude), float(instance.longitude)),
                (float(poi.latitude), float(poi.longitude))
            ).meters
            
            if distance < min_distance and distance <= 50:  # Радиус 50 метров
                min_distance = distance
                closest_poi = poi
        
        # Если найден POI, пересчитываем рейтинг
        if closest_poi:
            recalculate_poi_rating(closest_poi)


def recalculate_poi_rating(poi):
    """
    Пересчитывает рейтинг POI на основе всех отзывов
    
    Args:
        poi: Объект POI
    """
    from maps.models import POIRating
    from gamification.models import Review
    from geopy.distance import geodesic
    
    # Получаем рейтинг или создаем
    rating, created = POIRating.objects.get_or_create(poi=poi)
    
    # Получаем все отзывы для этого POI (в радиусе 50 метров)
    all_reviews = Review.objects.filter(
        review_type='poi_review'
    )
    
    # Фильтруем отзывы по расстоянию до POI
    poi_reviews = []
    for review in all_reviews:
        distance = geodesic(
            (float(poi.latitude), float(poi.longitude)),
            (float(review.latitude), float(review.longitude))
        ).meters
        if distance <= 50:  # Радиус 50 метров
            poi_reviews.append(review)
    
    # Обновляем счетчики
    rating.reviews_count = len(poi_reviews)
    approved_reviews = [r for r in poi_reviews if r.moderation_status == 'approved']
    rating.approved_reviews_count = len(approved_reviews)
    
    # Рассчитываем новый health_score на основе подтвержденных отзывов
    if approved_reviews:
        # Базовый рейтинг - среднее значение (можно улучшить с учетом категории)
        # Пока используем простую формулу: базовый рейтинг категории + влияние отзывов
        base_score = 50.0  # Нейтральное значение
        
        # Влияние отзывов: каждый подтвержденный отзыв немного меняет рейтинг
        # Положительные отзывы (уникальные) увеличивают, отрицательные (спам) уменьшают
        score_adjustment = 0.0
        for review in approved_reviews:
            if review.is_unique:
                score_adjustment += 5.0  # Уникальный отзыв увеличивает рейтинг
            else:
                score_adjustment += 1.0  # Дубликат немного увеличивает
        
        # Учитываем спам-отзывы (если есть)
        spam_reviews = [r for r in poi_reviews if r.moderation_status == 'spam_blocked']
        score_adjustment -= len(spam_reviews) * 3.0  # Спам уменьшает рейтинг
        
        # Финальный рейтинг (с ограничением 0-100)
        rating.health_score = max(0.0, min(100.0, base_score + score_adjustment))
        
        # Рассчитываем среднюю оценку пользователей (если есть поле rating в Review)
        # Пока оставляем None, так как в модели Review нет поля rating
    else:
        # Если нет подтвержденных отзывов, используем базовый рейтинг категории
        rating.health_score = 50.0
    
    rating.save()

