"""
Обновления существующих моделей для системы рейтингов

Содержит дополнения к моделям:
- POI: добавление полей form_data, form_schema_id, verified
- Review: добавление поля rating (1-5) и связи с POI
- POIRating: добавление полей S_infra, S_social
"""

# Этот файл содержит ТОЛЬКО описания изменений
# Реальные изменения нужно внести в maps/models.py через миграции

"""
=== ОБНОВЛЕНИЕ МОДЕЛИ POI ===

Добавить поля:
1. form_schema - ForeignKey на FormSchema (nullable, для связи с схемой анкеты)
2. form_data - JSONField (заполненные значения анкеты)
   Структура: {"field_id": "value", ...}
3. verified - BooleanField (официальная верификация объекта)
4. verified_by - ForeignKey на User (кто верифицировал, nullable)
5. verified_at - DateTimeField (дата верификации, nullable)

Пример:
    form_schema = models.ForeignKey(
        'maps.FormSchema',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pois',
        verbose_name='Схема анкеты'
    )
    
    form_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Данные анкеты'
    )
    
    verified = models.BooleanField(
        default=False,
        verbose_name='Верифицирован'
    )
    
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_pois',
        verbose_name='Верифицировал'
    )
    
    verified_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата верификации'
    )

=== ОБНОВЛЕНИЕ МОДЕЛИ Review (в gamification/models.py) ===

Добавить поля:
1. rating - IntegerField (оценка 1-5, nullable для инцидентов)
2. poi - ForeignKey на POI (nullable, для прямой связи)
3. sentiment_score - FloatField (результат LLM анализа, nullable)
4. extracted_facts - JSONField (факты, извлеченные LLM, nullable)

Пример:
    rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name='Оценка (1-5)'
    )
    
    poi = models.ForeignKey(
        'maps.POI',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviews',
        verbose_name='Объект POI'
    )
    
    sentiment_score = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(-1.0), MaxValueValidator(1.0)],
        verbose_name='Сентимент (LLM)'
    )
    
    extracted_facts = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Извлеченные факты (LLM)'
    )

=== ОБНОВЛЕНИЕ МОДЕЛИ POIRating ===

Добавить поля:
1. S_infra - FloatField (статический инфраструктурный рейтинг 0-100)
2. S_social - FloatField (динамический рейтинг по отзывам 0-100)
3. S_HIS - FloatField (итоговый Health Impact Score 0-100)
4. last_infra_calculation - DateTimeField (когда пересчитывался S_infra)
5. last_social_calculation - DateTimeField (когда пересчитывался S_social)
6. calculation_metadata - JSONField (метаданные расчета)

Пример:
    S_infra = models.FloatField(
        default=50.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name='Инфраструктурный рейтинг'
    )
    
    S_social = models.FloatField(
        default=50.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name='Социальный рейтинг'
    )
    
    S_HIS = models.FloatField(
        default=50.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name='Health Impact Score'
    )
    
    last_infra_calculation = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Последний расчет S_infra'
    )
    
    last_social_calculation = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Последний расчет S_social'
    )
    
    calculation_metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Метаданные расчета'
    )
    
    # Обновить поле health_score - теперь это алиас для S_HIS
    # или оставить для обратной совместимости
"""

