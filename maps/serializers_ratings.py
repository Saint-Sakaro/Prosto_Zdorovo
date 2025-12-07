"""
Serializers для работы с анкетами и рейтингами

Используются для:
- Создания и обновления схем анкет
- Заполнения анкет объектов
- Просмотра рейтингов
"""

from rest_framework import serializers
from maps.models import POI, POICategory, POIRating, FormSchema


class FormFieldSerializer(serializers.Serializer):
    """
    Serializer для поля анкеты (встроен в FormSchema)
    """
    id = serializers.CharField()
    type = serializers.ChoiceField(choices=['boolean', 'range', 'select', 'photo'])
    label = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    direction = serializers.IntegerField()  # +1 или -1
    weight = serializers.FloatField()
    scale_min = serializers.FloatField(required=False)
    scale_max = serializers.FloatField(required=False)
    options = serializers.ListField(required=False)
    mapping = serializers.DictField(required=False)


class FormSchemaSerializer(serializers.ModelSerializer):
    """
    Serializer для схемы анкеты
    
    Используется для:
    - Просмотра схемы
    - Создания/обновления схемы
    - Генерации через LLM
    """
    fields = serializers.ListField(
        child=FormFieldSerializer(),
        source='schema_json.fields',
        required=False
    )
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = FormSchema
        fields = [
            'uuid', 'category', 'category_name', 'name',
            'schema_json', 'fields', 'version',
            'generated_by_llm', 'llm_prompt', 'status',
            'approved_by', 'approved_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['uuid', 'created_at', 'updated_at']
    
    def validate_schema_json(self, value):
        """
        Валидация JSON схемы
        
        Проверяет корректность структуры схемы
        """
        if 'fields' not in value:
            raise serializers.ValidationError('Схема должна содержать поле "fields"')
        
        return value


class POIFormDataSerializer(serializers.Serializer):
    """
    Serializer для обновления данных анкеты объекта
    
    Body:
        {
            "form_data": {
                "field_id_1": "value1",
                "field_id_2": "value2"
            }
        }
    """
    form_data = serializers.DictField(
        required=True,
        help_text='Данные анкеты в формате {field_id: value}'
    )
    
    def validate_form_data(self, value):
        """
        Валидация данных анкеты
        
        Проверяет соответствие значений схеме анкеты
        """
        # Валидация form_data будет выполняться при сохранении POI
        # Здесь оставляем базовую проверку структуры
        if not isinstance(value, dict):
            raise serializers.ValidationError('form_data должен быть словарем')
        
        return value


class POIRatingDetailSerializer(serializers.ModelSerializer):
    """
    Serializer для детального просмотра рейтинга
    
    Показывает все компоненты рейтинга
    """
    poi_name = serializers.CharField(source='poi.name', read_only=True)
    poi_category = serializers.CharField(source='poi.category.name', read_only=True)
    
    class Meta:
        model = POIRating
        fields = [
            'uuid', 'poi', 'poi_name', 'poi_category',
            'S_infra', 'S_social', 'S_HIS',
            'health_score',  # Для обратной совместимости
            'reviews_count', 'approved_reviews_count',
            'last_infra_calculation', 'last_social_calculation',
            'calculation_metadata',
        ]
        read_only_fields = [
            'uuid', 'S_infra', 'S_social', 'S_HIS',
            'last_infra_calculation', 'last_social_calculation',
        ]

