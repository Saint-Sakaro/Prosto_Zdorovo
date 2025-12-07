"""
Команда для импорта категорий из Excel

Команда должна:
1. Читать Excel файл
2. Для каждого листа создавать категорию (если не существует)
3. Создавать FormSchema на основе анализа колонок
4. Определять веса и направления полей

Использование:
    python manage.py import_categories_from_excel path/to/file.xlsx --dry-run
"""

import os
from django.core.management.base import BaseCommand, CommandError
from maps.services.excel_category_analyzer import ExcelCategoryAnalyzer
from maps.services.category_fields_definition import (
    create_form_schema_for_category,
    get_fields_for_category,
    CATEGORY_FIELDS
)
from maps.models import POICategory, FormSchema
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Импортировать категории из Excel файла'
    
    def add_arguments(self, parser):
        parser.add_argument(
            'excel_file',
            type=str,
            help='Путь к Excel файлу'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Только показать, что будет создано, без сохранения'
        )
        parser.add_argument(
            '--use-predefined',
            action='store_true',
            help='Использовать предопределенные поля вместо анализа Excel'
        )
    
    def handle(self, *args, **options):
        excel_file = options['excel_file']
        dry_run = options['dry_run']
        use_predefined = options['use_predefined']
        
        # Проверяем существование файла
        if not os.path.exists(excel_file):
            raise CommandError(f'Файл {excel_file} не найден')
        
        self.stdout.write(f'Загрузка Excel файла: {excel_file}')
        
        try:
            analyzer = ExcelCategoryAnalyzer(excel_file)
        except Exception as e:
            raise CommandError(f'Ошибка при загрузке Excel файла: {e}')
        
        # Получаем список всех листов
        sheet_names = analyzer.get_all_sheets()
        self.stdout.write(f'Найдено листов: {len(sheet_names)}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('РЕЖИМ ПРОСМОТРА (dry-run) - изменения не будут сохранены'))
        
        stats = {
            'categories_created': 0,
            'categories_updated': 0,
            'schemas_created': 0,
            'schemas_updated': 0,
            'errors': []
        }
        
        for sheet_name in sheet_names:
            self.stdout.write('')
            self.stdout.write(f'Обработка листа: {sheet_name}')
            self.stdout.write('-' * 50)
            
            try:
                # Определяем название категории (используем название листа)
                category_name = sheet_name.strip()
                
                # Проверяем, существует ли категория
                try:
                    category = POICategory.objects.get(name=category_name)
                    self.stdout.write(f'  Категория "{category_name}" уже существует (обновление)')
                    stats['categories_updated'] += 1
                except POICategory.DoesNotExist:
                    # Создаем новую категорию
                    if not dry_run:
                        # Генерируем slug из названия
                        slug = category_name.lower().replace(' ', '-').replace('_', '-')
                        # Убираем специальные символы
                        slug = ''.join(c for c in slug if c.isalnum() or c == '-')
                        # Убираем двойные дефисы
                        while '--' in slug:
                            slug = slug.replace('--', '-')
                        
                        category = POICategory.objects.create(
                            name=category_name,
                            slug=slug,
                            is_active=True
                        )
                        self.stdout.write(self.style.SUCCESS(f'  Создана категория: {category_name}'))
                        stats['categories_created'] += 1
                    else:
                        self.stdout.write(f'  [DRY-RUN] Будет создана категория: {category_name}')
                        stats['categories_created'] += 1
                        continue
                
                # Создаем или обновляем схему формы
                if use_predefined:
                    # Используем предопределенные поля
                    fields_definition = get_fields_for_category(category_name)
                    
                    if fields_definition:
                        self.stdout.write(f'  Использованы предопределенные поля ({len(fields_definition)} полей)')
                        
                        if not dry_run:
                            schema = create_form_schema_for_category(category, fields_definition)
                            self.stdout.write(self.style.SUCCESS(f'  Создана/обновлена схема формы'))
                            stats['schemas_created'] += 1
                        else:
                            self.stdout.write(f'  [DRY-RUN] Будет создана схема с {len(fields_definition)} полями')
                    else:
                        self.stdout.write(self.style.WARNING(
                            f'  Предопределенных полей для "{category_name}" не найдено'
                        ))
                        # Анализируем Excel для создания схемы
                        self._create_schema_from_excel(
                            analyzer, sheet_name, category, dry_run, stats
                        )
                else:
                    # Анализируем Excel для создания схемы
                    self._create_schema_from_excel(
                        analyzer, sheet_name, category, dry_run, stats
                    )
                    
            except Exception as e:
                error_msg = f'Ошибка при обработке листа {sheet_name}: {e}'
                self.stdout.write(self.style.ERROR(error_msg))
                stats['errors'].append(error_msg)
                logger.error(error_msg, exc_info=True)
        
        # Выводим статистику
        self.stdout.write('')
        self.stdout.write('=' * 50)
        self.stdout.write('СТАТИСТИКА:')
        self.stdout.write(f'  Категорий создано: {stats["categories_created"]}')
        self.stdout.write(f'  Категорий обновлено: {stats["categories_updated"]}')
        self.stdout.write(f'  Схем создано: {stats["schemas_created"]}')
        self.stdout.write(f'  Схем обновлено: {stats["schemas_updated"]}')
        self.stdout.write(f'  Ошибок: {len(stats["errors"])}')
        
        if stats['errors']:
            self.stdout.write('')
            self.stdout.write(self.style.ERROR('Ошибки:'))
            for error in stats['errors']:
                self.stdout.write(f'  - {error}')
    
    def _create_schema_from_excel(self, analyzer, sheet_name, category, dry_run, stats):
        """Создать схему формы на основе анализа Excel"""
        # Анализируем лист
        analysis = analyzer.analyze_sheet(sheet_name)
        
        if 'error' in analysis:
            self.stdout.write(self.style.ERROR(f'  Ошибка анализа: {analysis["error"]}'))
            return
        
        # Получаем предложенную схему
        suggested_schema = analyzer.suggest_form_schema(sheet_name)
        
        if 'error' in suggested_schema:
            self.stdout.write(self.style.ERROR(f'  Ошибка создания схемы: {suggested_schema["error"]}'))
            return
        
        fields_count = len(suggested_schema.get('fields', []))
        self.stdout.write(f'  Проанализировано колонок: {len(analysis["columns"])}')
        self.stdout.write(f'  Предложено полей для формы: {fields_count}')
        
        if fields_count == 0:
            self.stdout.write(self.style.WARNING('  Не удалось предложить поля для формы'))
            return
        
        if not dry_run:
            # Создаем или обновляем схему
            schema, created = FormSchema.objects.update_or_create(
                category=category,
                defaults={
                    'name': f'Анкета для {category.name}',
                    'schema_json': suggested_schema,
                    'version': '1.0',
                    'status': 'draft',  # Начинаем с черновика для проверки
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'  Создана схема формы (статус: draft)'))
                stats['schemas_created'] += 1
            else:
                self.stdout.write(self.style.SUCCESS(f'  Обновлена схема формы'))
                stats['schemas_updated'] += 1
        else:
            self.stdout.write(f'  [DRY-RUN] Будет создана/обновлена схема с {fields_count} полями')

