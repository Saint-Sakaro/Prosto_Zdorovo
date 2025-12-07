"""
Celery задачи для пересчета рейтингов

Используется для:
- Периодического пересчета time decay для всех объектов
- Массового пересчета рейтингов
- Пересчета рейтингов для категории
"""

from celery import shared_task
from django.utils import timezone
from django.db import transaction
from maps.models import POI, POICategory, POIRating
from maps.services.health_impact_score_calculator import HealthImpactScoreCalculator
import logging

logger = logging.getLogger(__name__)


@shared_task
def recalculate_time_decay():
    """
    Периодический пересчет рейтингов с учетом time decay
    
    Выполняется ежедневно для обновления весов старых отзывов.
    Оптимизировано: batch processing для производительности.
    """
    calculator = HealthImpactScoreCalculator()
    pois = POI.objects.filter(is_active=True).select_related('category', 'rating')
    total = pois.count()
    processed = 0
    errors = 0
    
    logger.info(f"Начало пересчета time decay для {total} объектов")
    
    # Batch processing для оптимизации
    batch_size = 50
    batch = []
    
    for poi in pois:
        batch.append(poi)
        
        if len(batch) >= batch_size:
            with transaction.atomic():
                for p in batch:
                    try:
                        calculator.calculate_full_rating(p, save=True)
                        processed += 1
                    except Exception as e:
                        errors += 1
                        logger.error(f"Ошибка при пересчете для {p.name}: {str(e)}")
            batch = []
            
            # Логируем прогресс каждые 100 объектов
            if processed % 100 == 0:
                logger.info(f"Обработано {processed}/{total} объектов")
    
    # Обрабатываем оставшиеся объекты
    if batch:
        with transaction.atomic():
            for p in batch:
                try:
                    calculator.calculate_full_rating(p, save=True)
                    processed += 1
                except Exception as e:
                    errors += 1
                    logger.error(f"Ошибка при пересчете для {p.name}: {str(e)}")
    
    logger.info(f"Пересчет time decay завершен. Обработано: {processed}/{total}, Ошибок: {errors}")
    
    return {
        'total': total,
        'processed': processed,
        'errors': errors
    }


@shared_task
def recalculate_category_ratings(category_id):
    """
    Пересчет рейтингов для всех объектов категории
    
    Args:
        category_id: ID категории POICategory
    """
    try:
        category = POICategory.objects.get(pk=category_id)
        calculator = HealthImpactScoreCalculator()
        result = calculator.recalculate_for_category(category)
        
        logger.info(f"Пересчет для категории {category.name}: {result}")
        return result
    except POICategory.DoesNotExist:
        logger.error(f"Категория с ID {category_id} не найдена")
        return {'error': 'Category not found'}


@shared_task
def recalculate_all_ratings():
    """
    Полный пересчет рейтингов для всех объектов
    
    Используется для:
    - Первичной инициализации
    - Исправления данных после изменений в формулах
    
    Оптимизировано: batch processing для производительности.
    """
    calculator = HealthImpactScoreCalculator()
    pois = POI.objects.filter(is_active=True).select_related('category', 'rating')
    total = pois.count()
    processed = 0
    errors = 0
    
    logger.info(f"Начало полного пересчета рейтингов для {total} объектов")
    
    # Batch processing для оптимизации
    batch_size = 50
    batch = []
    
    for poi in pois:
        batch.append(poi)
        
        if len(batch) >= batch_size:
            with transaction.atomic():
                for p in batch:
                    try:
                        calculator.calculate_full_rating(p, save=True)
                        processed += 1
                    except Exception as e:
                        errors += 1
                        logger.error(f"Ошибка при пересчете для {p.name}: {str(e)}")
            batch = []
            
            if processed % 100 == 0:
                logger.info(f"Обработано {processed}/{total} объектов")
    
    # Обрабатываем оставшиеся объекты
    if batch:
        with transaction.atomic():
            for p in batch:
                try:
                    calculator.calculate_full_rating(p, save=True)
                    processed += 1
                except Exception as e:
                    errors += 1
                    logger.error(f"Ошибка при пересчете для {p.name}: {str(e)}")
    
    logger.info(f"Полный пересчет завершен. Обработано: {processed}/{total}, Ошибок: {errors}")
    
    return {
        'total': total,
        'processed': processed,
        'errors': errors
    }

