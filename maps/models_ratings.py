"""
Модели для системы динамических анкет и расчета рейтингов

Содержит модели:
- FormSchema: JSON-схема анкеты для категории объектов
- FormField: Поле анкеты (встроено в JSON схему, но может быть отдельной моделью)
- Обновления существующих моделей: POI, Review, POIRating
"""

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid
import json


class FormSchema(models.Model):
    """
    JSON-схема анкеты для категории объектов
    
    Хранит структуру анкеты с полями, весами и типами.
    Каждая категория может иметь свою схему анкеты.
    """
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='UUID'
    )
    
    # Связь с категорией POI
    category = models.OneToOneField(
        'maps.POICategory',
        on_delete=models.CASCADE,
        related_name='form_schema',
        verbose_name='Категория'
    )
    
    # Название схемы
    name = models.CharField(
        max_length=200,
        verbose_name='Название схемы'
    )
    
    # JSON-схема анкеты
    # Структура:
    # {
    #   "fields": [
    #     {
    #       "id": "field_id",
    #       "type": "boolean|range|select|photo",
    #       "label": "Название поля",
    #       "direction": 1 или -1,
    #       "weight": float,
    #       "scale_min": float (для range),
    #       "scale_max": float (для range),
    #       "mapping": {value: normalized_value} (для select),
    #       "options": [список значений] (для select)
    #     }
    #   ],
    #   "version": "1.0",
    #   "generated_by_llm": bool,
    #   "llm_prompt": str (если генерировалась через LLM)
    # }
    schema_json = models.JSONField(
        default=dict,
        verbose_name='JSON схема анкеты'
    )
    
    # Версия схемы (для отслеживания изменений)
    version = models.CharField(
        max_length=20,
        default='1.0',
        verbose_name='Версия схемы'
    )
    
    # Флаг генерации через LLM
    generated_by_llm = models.BooleanField(
        default=False,
        verbose_name='Сгенерирована через LLM'
    )
    
    # Промпт для LLM (если использовалась генерация)
    llm_prompt = models.TextField(
        blank=True,
        verbose_name='Промпт для LLM'
    )
    
    # Статус схемы
    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('pending_review', 'Ожидает проверки'),
        ('approved', 'Утверждена'),
        ('archived', 'Архивная'),
    ]
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name='Статус'
    )
    
    # Кто утвердил схему
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_schemas',
        verbose_name='Утвердил'
    )
    
    # Дата утверждения
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата утверждения'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    class Meta:
        verbose_name = 'Схема анкеты'
        verbose_name_plural = 'Схемы анкет'
        ordering = ['category__name', 'version']
    
    def __str__(self):
        return f"{self.category.name} - {self.name} (v{self.version})"
    
    def get_fields(self):
        """
        Получить список полей из JSON схемы
        
        Returns:
            list: Список словарей с полями анкеты
        """
        # TODO: Реализовать получение полей из schema_json
        # Вернуть self.schema_json.get('fields', [])
        return self.schema_json.get('fields', [])
    
    def validate_schema(self):
        """
        Валидация JSON схемы
        
        Returns:
            tuple: (is_valid: bool, errors: list)
        """
        # TODO: Реализовать валидацию схемы
        # Проверить:
        # - Наличие поля 'fields'
        # - Корректность типов полей
        # - Наличие обязательных атрибутов для каждого типа
        # - Корректность весов и направлений
        # Вернуть (True, []) или (False, [список ошибок])
        pass


# Обновления существующих моделей будут в отдельном файле
# или добавлены в maps/models.py через миграции

