"""
Views для работы с анкетами и рейтингами

Реализует эндпоинты для:
- Управления схемами анкет
- Заполнения анкет объектов
- Просмотра рейтингов
- Генерации анкет через LLM
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from maps.models import POI, POICategory, POIRating, FormSchema
from maps.serializers_ratings import (
    FormSchemaSerializer, POIFormDataSerializer, POIRatingDetailSerializer
)
from maps.services.health_impact_score_calculator import HealthImpactScoreCalculator
from maps.services.llm_service import LLMService


class FormSchemaViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления схемами анкет
    
    Эндпоинты:
    - GET /api/maps/form-schemas/ - список схем
    - POST /api/maps/form-schemas/ - создать схему
    - GET /api/maps/form-schemas/{id}/ - детали схемы
    - PUT /api/maps/form-schemas/{id}/ - обновить схему
    - POST /api/maps/form-schemas/{id}/generate-llm/ - сгенерировать через LLM
    """
    queryset = FormSchema.objects.all()
    serializer_class = FormSchemaSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Фильтрация схем по категории
        """
        queryset = FormSchema.objects.all()
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category__slug=category)
        return queryset
    
    @action(detail=False, methods=['post'], url_path='generate-for-category')
    def generate_for_category(self, request):
        """
        Генерирует схему анкеты для категории через LLM
        
        Body:
            {
                "category_id": int,
                "category_description": "string (optional)"
            }
        
        Returns:
            Response с сгенерированной схемой
        """
        category_id = request.data.get('category_id')
        category_description = request.data.get('category_description', '')
        
        try:
            category = POICategory.objects.get(pk=category_id)
        except POICategory.DoesNotExist:
            return Response(
                {'error': 'Категория не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Генерируем схему через LLM
        llm_service = LLMService()
        schema_json = llm_service.generate_schema(
            category.name,
            category_description
        )
        
        # Создаем схему
        schema = FormSchema.objects.create(
            category=category,
            name=f"Анкета для {category.name}",
            schema_json=schema_json,
            generated_by_llm=True,
            status='draft'
        )
        
        serializer = self.get_serializer(schema)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        """
        Утверждает схему анкеты
        
        Returns:
            Response с обновленной схемой
        """
        from django.utils import timezone
        
        schema = self.get_object()
        schema.status = 'approved'
        schema.approved_by = request.user
        schema.approved_at = timezone.now()
        schema.save()
        
        serializer = self.get_serializer(schema)
        return Response(serializer.data)


class POIFormDataView(APIView):
    """
    View для обновления данных анкеты объекта
    
    Эндпоинты:
    - PUT /api/maps/pois/{uuid}/form-data/ - обновить данные анкеты
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def put(self, request, uuid):
        """
        Обновляет данные анкеты объекта
        
        Body:
            {
                "form_data": {
                    "field_id_1": "value1",
                    "field_id_2": "value2"
                }
            }
        
        Returns:
            Response с обновленным объектом
        """
        try:
            poi = POI.objects.get(uuid=uuid)
        except POI.DoesNotExist:
            return Response(
                {'error': 'Объект не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = POIFormDataSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Обновляем данные анкеты
        poi.form_data = serializer.validated_data['form_data']
        poi.save()
        
        # Сигнал автоматически пересчитает рейтинг
        # Но можно вызвать явно для гарантии
        calculator = HealthImpactScoreCalculator()
        calculator.calculate_full_rating(poi, save=True)
        
        from maps.serializers import POISerializer
        poi_serializer = POISerializer(poi)
        return Response(poi_serializer.data)


class POIRatingViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для просмотра рейтингов объектов
    
    Эндпоинты:
    - GET /api/maps/ratings/ - список рейтингов
    - GET /api/maps/ratings/{id}/ - детали рейтинга
    - POST /api/maps/ratings/{id}/recalculate/ - пересчитать рейтинг
    """
    queryset = POIRating.objects.all()
    serializer_class = POIRatingDetailSerializer
    permission_classes = [permissions.AllowAny]  # Публичный доступ
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def recalculate(self, request, pk=None):
        """
        Пересчитывает рейтинг объекта
        
        Returns:
            Response с обновленным рейтингом
        """
        rating = self.get_object()
        calculator = HealthImpactScoreCalculator()
        calculator.calculate_full_rating(rating.poi, save=True)
        
        # Обновляем объект из БД
        rating.refresh_from_db()
        serializer = self.get_serializer(rating)
        return Response(serializer.data)

