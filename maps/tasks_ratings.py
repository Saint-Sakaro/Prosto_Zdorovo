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
from maps.services.llm_service import LLMService
from gamification.models import Review
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
    # Пересчитываем рейтинг только для одобренных мест
    pois = POI.objects.filter(
        is_active=True, 
        moderation_status='approved'
    ).select_related('category', 'rating')
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
    # Пересчитываем рейтинг только для одобренных мест
    pois = POI.objects.filter(
        is_active=True, 
        moderation_status='approved'
    ).select_related('category', 'rating')
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


@shared_task
def update_poi_llm_rating(poi_id):
    """
    Обновляет LLM рейтинг и отчет для POI на основе анализа всех отзывов
    
    Args:
        poi_id: ID объекта POI
    """
    try:
        poi = POI.objects.get(id=poi_id)
    except POI.DoesNotExist:
        logger.error(f"POI с ID {poi_id} не найден")
        return
    
    # Получаем все одобренные отзывы для этой точки
    reviews = Review.objects.filter(
        poi=poi,
        moderation_status='approved',
        review_type='poi_review'
    ).select_related('author').order_by('-created_at')
    
    if not reviews.exists():
        logger.info(f"Нет одобренных отзывов для POI {poi_id}, пропускаем LLM анализ")
        return
    
    # Формируем список отзывов для анализа
    reviews_data = []
    for review in reviews:
        reviews_data.append({
            'content': review.content,
            'rating': review.rating,
            'author': review.author.username if review.author else 'Аноним',
            'created_at': review.created_at.strftime('%Y-%m-%d %H:%M:%S') if review.created_at else '',
            'has_media': review.has_media
        })
    
    try:
        # Инициализируем LLM сервис
        llm_service = LLMService()
        
        # Анализируем отзывы и получаем рейтинг
        analysis_result = llm_service.analyze_poi_reviews(poi, reviews_data)
        
        # Генерируем отчет
        report = llm_service.generate_poi_report(poi, reviews_data, analysis_result)
        
        # Обновляем POI
        with transaction.atomic():
            poi.llm_rating = analysis_result.get('llm_rating')
            poi.llm_report = report
            poi.llm_analyzed_at = timezone.now()
            poi.save(update_fields=['llm_rating', 'llm_report', 'llm_analyzed_at'])
        
        logger.info(f"LLM рейтинг обновлен для POI {poi_id}: {analysis_result.get('llm_rating')}")
        
    except Exception as e:
        logger.error(f"Ошибка при обновлении LLM рейтинга для POI {poi_id}: {str(e)}")
        import traceback
        logger.debug(f'Traceback: {traceback.format_exc()}')


@shared_task
def update_all_pois_llm_ratings():
    """
    Массовое обновление LLM рейтингов для всех POI с отзывами
    """
    pois_with_reviews = POI.objects.filter(
        reviews__moderation_status='approved',
        reviews__review_type='poi_review'
    ).distinct()
    
    total = pois_with_reviews.count()
    logger.info(f"Начало массового обновления LLM рейтингов для {total} объектов")
    
    for poi in pois_with_reviews:
        update_poi_llm_rating.delay(poi.id)
    
    logger.info(f"Запущено обновление LLM рейтингов для {total} объектов")

