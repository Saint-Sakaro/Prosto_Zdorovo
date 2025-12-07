"""
Сервис расчета итогового Health Impact Score (HIS)

Объединяет инфраструктурный и социальный рейтинги
с учетом верификации объекта.
"""

from maps.models import POI, POIRating
from maps.services.infrastructure_score_calculator import InfrastructureScoreCalculator
from maps.services.social_score_calculator import SocialScoreCalculator


class HealthImpactScoreCalculator:
    """
    Класс для расчета итогового Health Impact Score
    
    Методы:
    - calculate_his(): Расчет итогового HIS для объекта
    - calculate_full_rating(): Полный пересчет всех компонентов рейтинга
    """
    
    def __init__(self):
        """
        Инициализация с параметрами из настроек
        """
        self.infra_calculator = InfrastructureScoreCalculator()
        self.social_calculator = SocialScoreCalculator()
        
        # Веса компонентов (можно вынести в settings)
        self.infra_weight = 0.7  # Вес инфраструктурного рейтинга
        self.social_weight = 0.3  # Вес социального рейтинга
        
        # Бонус за верификацию
        self.verification_bonus = 5.0  # Баллы за верификацию
    
    def calculate_his(self, poi, S_infra=None, S_social=None):
        """
        Рассчитывает итоговый Health Impact Score
        
        Args:
            poi: Объект POI
            S_infra: Инфраструктурный рейтинг (если None - рассчитает)
            S_social: Социальный рейтинг (если None - рассчитает)
        
        Returns:
            float: S_HIS в диапазоне 0-100
        """
        # Рассчитываем компоненты, если не указаны
        if S_infra is None:
            S_infra = self.infra_calculator.calculate_infra_score(poi)
        
        if S_social is None:
            S_social = self.social_calculator.calculate_social_score(poi)
        
        # Базовый индекс (взвешенная сумма)
        S_base = (
            self.infra_weight * S_infra +
            self.social_weight * S_social
        )
        
        # Бонус за верификацию
        if poi.verified:
            S_raw = S_base + self.verification_bonus
        else:
            S_raw = S_base
        
        # Нормализуем в диапазон 0-100
        S_HIS = max(0.0, min(100.0, S_raw))
        
        return round(S_HIS, 2)
    
    def calculate_full_rating(self, poi, save=True):
        """
        Полный пересчет всех компонентов рейтинга для объекта
        
        Args:
            poi: Объект POI
            save: Сохранять ли результаты в POIRating
        
        Returns:
            dict: {
                'S_infra': float,
                'S_social': float,
                'S_HIS': float,
            }
        """
        from django.utils import timezone
        
        # Рассчитываем компоненты
        S_infra = self.infra_calculator.calculate_infra_score(poi)
        S_social = self.social_calculator.calculate_social_score(poi)
        S_HIS = self.calculate_his(poi, S_infra=S_infra, S_social=S_social)
        
        results = {
            'S_infra': S_infra,
            'S_social': S_social,
            'S_HIS': S_HIS,
        }
        
        # Сохраняем в POIRating
        if save:
            rating, created = POIRating.objects.get_or_create(poi=poi)
            rating.S_infra = S_infra
            rating.S_social = S_social
            rating.S_HIS = S_HIS
            rating.health_score = S_HIS  # Для обратной совместимости
            rating.last_infra_calculation = timezone.now()
            rating.last_social_calculation = timezone.now()
            rating.save()
        
        return results
    
    def recalculate_for_category(self, category):
        """
        Пересчитать рейтинги для всех объектов категории
        
        Args:
            category: Объект POICategory
        
        Returns:
            dict: Статистика пересчета
        """
        pois = POI.objects.filter(category=category, is_active=True)
        count = 0
        
        for poi in pois:
            try:
                self.calculate_full_rating(poi, save=True)
                count += 1
            except Exception as e:
                # Логируем ошибку, но продолжаем
                print(f"Ошибка при пересчете для {poi.name}: {e}")
        
        return {
            'total': pois.count(),
            'processed': count,
            'errors': pois.count() - count
        }

