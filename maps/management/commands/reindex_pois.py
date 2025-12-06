"""
Django management команда для переиндексации всех POI в OpenSearch

Использование:
    python manage.py reindex_pois
"""

from django.core.management.base import BaseCommand
from maps.services.opensearch_service import OpenSearchService


class Command(BaseCommand):
    help = 'Переиндексировать все POI в OpenSearch'

    def handle(self, *args, **options):
        opensearch = OpenSearchService()
        
        if not opensearch.enabled:
            self.stdout.write(
                self.style.ERROR('OpenSearch недоступен. Проверьте настройки подключения.')
            )
            return
        
        self.stdout.write('Начинаю переиндексацию POI...')
        
        count = opensearch.reindex_all()
        
        if count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'Успешно переиндексировано {count} POI')
            )
        else:
            self.stdout.write(
                self.style.WARNING('Не удалось переиндексировать POI')
            )

