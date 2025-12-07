"""
Команда для добавления полей модерации, если они отсутствуют в БД

Использование:
    python manage.py fix_moderation_fields
"""

from django.core.management.base import BaseCommand
from django.db import connection
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Добавить поля модерации в таблицу maps_poi, если они отсутствуют'
    
    def handle(self, *args, **options):
        self.stdout.write('Проверка наличия полей модерации в таблице maps_poi...')
        
        with connection.cursor() as cursor:
            # Проверяем наличие колонок
            if connection.vendor == 'postgresql':
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='maps_poi' AND column_name IN (
                        'llm_verdict', 'moderated_at', 'moderated_by_id', 
                        'moderation_comment', 'moderation_status', 'submitted_by_id'
                    )
                """)
            elif connection.vendor == 'sqlite':
                cursor.execute("""
                    SELECT name FROM pragma_table_info('maps_poi') 
                    WHERE name IN (
                        'llm_verdict', 'moderated_at', 'moderated_by_id', 
                        'moderation_comment', 'moderation_status', 'submitted_by_id'
                    )
                """)
            else:
                self.stdout.write(
                    self.style.ERROR(f'Неподдерживаемая БД: {connection.vendor}')
                )
                return
            
            existing = {row[0] for row in cursor.fetchall()}
            self.stdout.write(f'Существующие колонки: {existing}')
            
            added_count = 0
            
            # Добавляем moderation_status
            if 'moderation_status' not in existing:
                try:
                    if connection.vendor == 'postgresql':
                        cursor.execute("""
                            ALTER TABLE maps_poi 
                            ADD COLUMN moderation_status VARCHAR(20) DEFAULT 'approved';
                        """)
                        # Обновляем существующие записи
                        cursor.execute("""
                            UPDATE maps_poi 
                            SET moderation_status = 'approved' 
                            WHERE moderation_status IS NULL;
                        """)
                        cursor.execute("""
                            ALTER TABLE maps_poi 
                            ALTER COLUMN moderation_status SET NOT NULL;
                        """)
                    elif connection.vendor == 'sqlite':
                        cursor.execute("""
                            ALTER TABLE maps_poi 
                            ADD COLUMN moderation_status VARCHAR(20) DEFAULT 'approved';
                        """)
                    self.stdout.write(self.style.SUCCESS('  ✓ Добавлена колонка moderation_status'))
                    added_count += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  ✗ Ошибка при добавлении moderation_status: {e}'))
            
            # Добавляем submitted_by_id
            if 'submitted_by_id' not in existing:
                try:
                    if connection.vendor == 'postgresql':
                        cursor.execute("""
                            ALTER TABLE maps_poi 
                            ADD COLUMN submitted_by_id INTEGER 
                            REFERENCES auth_user(id) ON DELETE SET NULL;
                        """)
                    elif connection.vendor == 'sqlite':
                        cursor.execute("""
                            ALTER TABLE maps_poi 
                            ADD COLUMN submitted_by_id INTEGER 
                            REFERENCES auth_user(id);
                        """)
                    self.stdout.write(self.style.SUCCESS('  ✓ Добавлена колонка submitted_by_id'))
                    added_count += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  ✗ Ошибка при добавлении submitted_by_id: {e}'))
            
            # Добавляем moderated_by_id
            if 'moderated_by_id' not in existing:
                try:
                    if connection.vendor == 'postgresql':
                        cursor.execute("""
                            ALTER TABLE maps_poi 
                            ADD COLUMN moderated_by_id INTEGER 
                            REFERENCES auth_user(id) ON DELETE SET NULL;
                        """)
                    elif connection.vendor == 'sqlite':
                        cursor.execute("""
                            ALTER TABLE maps_poi 
                            ADD COLUMN moderated_by_id INTEGER 
                            REFERENCES auth_user(id);
                        """)
                    self.stdout.write(self.style.SUCCESS('  ✓ Добавлена колонка moderated_by_id'))
                    added_count += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  ✗ Ошибка при добавлении moderated_by_id: {e}'))
            
            # Добавляем moderated_at
            if 'moderated_at' not in existing:
                try:
                    if connection.vendor == 'postgresql':
                        cursor.execute("""
                            ALTER TABLE maps_poi 
                            ADD COLUMN moderated_at TIMESTAMP NULL;
                        """)
                    elif connection.vendor == 'sqlite':
                        cursor.execute("""
                            ALTER TABLE maps_poi 
                            ADD COLUMN moderated_at DATETIME NULL;
                        """)
                    self.stdout.write(self.style.SUCCESS('  ✓ Добавлена колонка moderated_at'))
                    added_count += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  ✗ Ошибка при добавлении moderated_at: {e}'))
            
            # Добавляем moderation_comment
            if 'moderation_comment' not in existing:
                try:
                    if connection.vendor == 'postgresql':
                        cursor.execute("""
                            ALTER TABLE maps_poi 
                            ADD COLUMN moderation_comment TEXT;
                        """)
                    elif connection.vendor == 'sqlite':
                        cursor.execute("""
                            ALTER TABLE maps_poi 
                            ADD COLUMN moderation_comment TEXT;
                        """)
                    self.stdout.write(self.style.SUCCESS('  ✓ Добавлена колонка moderation_comment'))
                    added_count += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  ✗ Ошибка при добавлении moderation_comment: {e}'))
            
            # Добавляем llm_verdict
            if 'llm_verdict' not in existing:
                try:
                    if connection.vendor == 'postgresql':
                        cursor.execute("""
                            ALTER TABLE maps_poi 
                            ADD COLUMN llm_verdict JSONB DEFAULT '{}'::jsonb;
                        """)
                    elif connection.vendor == 'sqlite':
                        cursor.execute("""
                            ALTER TABLE maps_poi 
                            ADD COLUMN llm_verdict TEXT DEFAULT '{}';
                        """)
                    self.stdout.write(self.style.SUCCESS('  ✓ Добавлена колонка llm_verdict'))
                    added_count += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  ✗ Ошибка при добавлении llm_verdict: {e}'))
        
        if added_count > 0:
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS(f'Добавлено колонок: {added_count}'))
        else:
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('Все колонки уже существуют!'))

