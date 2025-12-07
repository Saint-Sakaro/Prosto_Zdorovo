"""
Сигналы для автоматического пересчета рейтингов

Обрабатывает события:
- Изменение данных анкеты объекта → пересчет S_infra
- Добавление/изменение/удаление отзыва → пересчет S_social
- Изменение репутации автора → пересчет S_social для его отзывов
- Периодический пересчет time decay
"""

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.utils import timezone
from maps.models import POI, POIRating
from gamification.models import Review
from maps.services.health_impact_score_calculator import HealthImpactScoreCalculator


@receiver(post_save, sender=POI)
def recalculate_rating_on_poi_change(sender, instance, **kwargs):
    """
    Пересчитывает рейтинг при изменении описания объекта или при одобрении
    
    Args:
        sender: Модель POI
        instance: Экземпляр POI
        **kwargs: Дополнительные аргументы
    """
    # Пересчитываем рейтинг если:
    # 1. Объект одобрен и активен (для создания POIRating)
    # 2. Изменилось описание (для пересчета S_infra)
    if instance.is_active and instance.moderation_status == 'approved':
        calculator = HealthImpactScoreCalculator()
        calculator.calculate_full_rating(instance, save=True)


@receiver(post_save, sender=Review)
def recalculate_rating_on_review_change(sender, instance, **kwargs):
    """
    Пересчитывает рейтинг при изменении отзыва
    
    Args:
        sender: Модель Review
        instance: Экземпляр Review
        **kwargs: Дополнительные аргументы
    """
    if instance.review_type == 'poi_review' and instance.moderation_status == 'approved':
        # Ищем связанный POI
        poi = None
        
        # Сначала проверяем прямую связь
        if hasattr(instance, 'poi') and instance.poi:
            poi = instance.poi
        else:
            # Ищем по координатам среди одобренных мест
            from geopy.distance import geodesic
            pois = POI.objects.filter(is_active=True, moderation_status='approved')
            
            for p in pois:
                distance = geodesic(
                    (float(instance.latitude), float(instance.longitude)),
                    (float(p.latitude), float(p.longitude))
                ).meters
                
                if distance <= 50:
                    poi = p
                    break
        
        if poi:
            calculator = HealthImpactScoreCalculator()
            calculator.calculate_full_rating(poi, save=True)


@receiver(post_delete, sender=Review)
def recalculate_rating_on_review_delete(sender, instance, **kwargs):
    """
    Пересчитывает рейтинг при удалении отзыва
    
    Args:
        sender: Модель Review
        instance: Экземпляр Review
        **kwargs: Дополнительные аргументы
    """
    if instance.review_type == 'poi_review':
        # Сохраняем координаты перед удалением
        lat = instance.latitude
        lon = instance.longitude
        
        # Ищем POI по координатам среди одобренных мест
        from geopy.distance import geodesic
        pois = POI.objects.filter(is_active=True, moderation_status='approved')
        
        for poi in pois:
            distance = geodesic(
                (float(lat), float(lon)),
                (float(poi.latitude), float(poi.longitude))
            ).meters
            
            if distance <= 50:
                calculator = HealthImpactScoreCalculator()
                calculator.calculate_full_rating(poi, save=True)
                break


@receiver(post_save, sender=Review)
def analyze_review_with_llm(sender, instance, created, **kwargs):
    """
    Анализирует отзыв через LLM при создании/изменении
    
    Args:
        sender: Модель Review
        instance: Экземпляр Review
        created: True если отзыв только что создан
        **kwargs: Дополнительные аргументы
    """
    if instance.review_type == 'poi_review' and instance.content:
        from maps.services.llm_service import LLMService
        
        llm_service = LLMService()
        
        # Получаем категорию POI (если есть связь)
        category = None
        if hasattr(instance, 'poi') and instance.poi:
            category = instance.poi.category.name
        
        # Анализируем отзыв
        analysis = llm_service.analyze_review(instance.content, category)
        
        # Сохраняем результаты (без триггера сигналов, чтобы избежать рекурсии)
        Review.objects.filter(pk=instance.pk).update(
            extracted_facts=analysis.get('extracted_facts', {}),
            sentiment_score=analysis.get('sentiment', 0.0)
        )
        
        # Проверяем соответствие сентимента и оценки
        if instance.rating:
            consistency = llm_service.check_sentiment_consistency(
                instance.content,
                instance.rating
            )
            
            # Если несоответствие - можно пометить для модерации
            if not consistency.get('is_consistent'):
                # Можно добавить флаг или комментарий
                pass

