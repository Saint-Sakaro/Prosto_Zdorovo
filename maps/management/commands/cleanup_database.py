"""
Команда Django для очистки БД от POI, категорий и схем

Использование:
    python manage.py cleanup_database --confirm

Опции:
    --confirm: Подтверждение очистки (обязательно)
    --keep-users-data: Сохранить данные пользователей (отзывы и т.д.)
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from maps.models import POI, POICategory, FormSchema, POIRating
from gamification.models import Review
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Очистить БД от POI, категорий и схем (сохранить пользователей)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Подтверждение очистки'
        )
        parser.add_argument(
            '--keep-users-data',
            action='store_true',
            help='Сохранить данные пользователей (отзывы)'
        )
    
    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.ERROR(
                    'ОШИБКА: Для очистки БД необходимо указать флаг --confirm'
                )
            )
            self.stdout.write('Пример: python manage.py cleanup_database --confirm')
            return
        
        keep_users_data = options.get('keep_users_data', False)
        
        self.stdout.write('Начинаем очистку БД...')
        self.stdout.write('=' * 50)
        
        stats = {
            'poi_ratings': 0,
            'pois': 0,
            'form_schemas': 0,
            'categories': 0,
        }
        
        try:
            with transaction.atomic():
                # 1. Удалить все POIRating
                self.stdout.write('1. Удаление рейтингов POI...')
                poi_ratings_count = POIRating.objects.all().count()
                POIRating.objects.all().delete()
                stats['poi_ratings'] = poi_ratings_count
                self.stdout.write(
                    self.style.SUCCESS(f'   Удалено рейтингов: {poi_ratings_count}')
                )
                
                # 2. Удалить все POI
                self.stdout.write('2. Удаление POI...')
                
                if keep_users_data:
                    # Найти POI, связанные с отзывами
                    reviews_with_poi = Review.objects.filter(poi__isnull=False).values_list('poi_id', flat=True)
                    poi_count = POI.objects.exclude(id__in=reviews_with_poi).count()
                    POI.objects.exclude(id__in=reviews_with_poi).delete()
                    self.stdout.write(
                        self.style.WARNING(
                            f'   Удалено POI: {poi_count} (сохранены POI, связанные с отзывами)'
                        )
                    )
                else:
                    poi_count = POI.objects.all().count()
                    POI.objects.all().delete()
                    self.stdout.write(
                        self.style.SUCCESS(f'   Удалено POI: {poi_count}')
                    )
                stats['pois'] = poi_count
                
                # 3. Удалить все FormSchema
                self.stdout.write('3. Удаление схем анкет...')
                form_schemas_count = FormSchema.objects.all().count()
                FormSchema.objects.all().delete()
                stats['form_schemas'] = form_schemas_count
                self.stdout.write(
                    self.style.SUCCESS(f'   Удалено схем: {form_schemas_count}')
                )
                
                # 4. Удалить все POICategory
                self.stdout.write('4. Удаление категорий...')
                categories_count = POICategory.objects.all().count()
                POICategory.objects.all().delete()
                stats['categories'] = categories_count
                self.stdout.write(
                    self.style.SUCCESS(f'   Удалено категорий: {categories_count}')
                )
                
                self.stdout.write('=' * 50)
                self.stdout.write(self.style.SUCCESS('Очистка БД завершена успешно!'))
                self.stdout.write('')
                self.stdout.write('Статистика удаленных записей:')
                self.stdout.write(f'  - Рейтинги POI: {stats["poi_ratings"]}')
                self.stdout.write(f'  - POI: {stats["pois"]}')
                self.stdout.write(f'  - Схемы анкет: {stats["form_schemas"]}')
                self.stdout.write(f'  - Категории: {stats["categories"]}')
                self.stdout.write('')
                
                if keep_users_data:
                    self.stdout.write(
                        self.style.SUCCESS('Данные пользователей (отзывы) сохранены')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING('ВНИМАНИЕ: Все данные удалены, включая связанные с пользователями')
                    )
                    
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'ОШИБКА при очистке БД: {str(e)}')
            )
            logger.error(f'Ошибка при очистке БД: {str(e)}', exc_info=True)
            raise

