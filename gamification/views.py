"""
ViewSets и Views для REST API модуля геймификации

Реализует эндпоинты для:
- Профиля пользователя
- Создания и просмотра отзывов
- Модерации отзывов
- Таблиц лидеров
- Маркетплейса наград
- Достижений
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone

from gamification.models import (
    UserProfile, Review, RewardTransaction, Reward, UserReward,
    Achievement, UserAchievement, ModerationLog
)
from gamification.serializers import (
    UserProfileSerializer, ReviewSerializer, ReviewCreateSerializer,
    ReviewModerationSerializer, RewardTransactionSerializer,
    RewardSerializer, UserRewardSerializer, AchievementSerializer,
    UserAchievementSerializer, LeaderboardEntrySerializer,
    ModerationLogSerializer
)
from gamification.services.uniqueness_checker import UniquenessChecker
from gamification.services.reward_manager import RewardManager
from gamification.services.moderation_service import ModerationService
from gamification.services.leaderboard_service import LeaderboardService
from gamification.utils import get_or_create_user_profile


class UserProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для профиля пользователя
    
    Эндпоинты:
    - GET /api/gamification/profiles/ - список профилей (только для чтения)
    - GET /api/gamification/profiles/{id}/ - детали профиля
    - GET /api/gamification/profiles/me/ - текущий пользователь
    """
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Получить профиль текущего пользователя
        
        Returns:
            Response с данными профиля пользователя
        """
        user_profile = get_or_create_user_profile(request.user)
        serializer = self.get_serializer(user_profile)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def achievements(self, request, pk=None):
        """
        Получить достижения пользователя
        
        Returns:
            Response со списком достижений пользователя
        """
        user_profile = self.get_object()
        achievements = UserAchievement.objects.filter(user=user_profile.user)
        serializer = UserAchievementSerializer(achievements, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        """
        Получить историю транзакций пользователя
        
        Query params:
            - limit: количество записей
            - offset: смещение для пагинации
        
        Returns:
            Response со списком транзакций
        """
        user_profile = self.get_object()
        transactions = RewardTransaction.objects.filter(user=user_profile.user)
        
        # Применяем пагинацию
        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))
        transactions = transactions[offset:offset + limit]
        
        serializer = RewardTransactionSerializer(transactions, many=True)
        return Response({
            'count': RewardTransaction.objects.filter(user=user_profile.user).count(),
            'results': serializer.data
        })


class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet для отзывов
    
    Эндпоинты:
    - POST /api/gamification/reviews/ - создать отзыв
    - GET /api/gamification/reviews/ - список отзывов
    - GET /api/gamification/reviews/{id}/ - детали отзыва
    - POST /api/gamification/reviews/{id}/moderate/ - модерация отзыва
    """
    queryset = Review.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """
        Выбор serializer в зависимости от действия
        """
        if self.action == 'create':
            return ReviewCreateSerializer
        return ReviewSerializer
    
    def perform_create(self, serializer):
        """
        Создание нового отзыва с проверкой уникальности
        
        Args:
            serializer: ReviewCreateSerializer
        """
        from gamification.utils import validate_coordinates, get_or_create_user_profile
        from django.utils import timezone as tz
        
        uniqueness_checker = UniquenessChecker()
        reward_manager = RewardManager()
        
        # Валидация координат
        data = serializer.validated_data
        validate_coordinates(data['latitude'], data['longitude'])
        
        # Проверка блокировки аккаунта
        user_profile = get_or_create_user_profile(self.request.user)
        if user_profile.is_banned:
            if user_profile.banned_until and user_profile.banned_until > tz.now():
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Ваш аккаунт заблокирован до {}. Обратитесь в поддержку.".format(
                    user_profile.banned_until.strftime('%d.%m.%Y %H:%M')
                ))
            elif user_profile.banned_until is None:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Ваш аккаунт заблокирован. Обратитесь в поддержку.")
        
        # Сохраняем отзыв с автором
        review = serializer.save(author=self.request.user)
        
        # Проверяем уникальность
        uniqueness_result = uniqueness_checker.check_uniqueness(
            review.latitude,
            review.longitude,
            review.category,
            review.review_type,
            review.created_at
        )
        
        review.is_unique = uniqueness_result['is_unique']
        
        if review.is_unique:
            # Уникальный отзыв - отправляем на модерацию
            review.moderation_status = 'pending'
        else:
            # Дубликат - автоматически принимаем и начисляем минимальные баллы
            review.moderation_status = 'approved'
            review.moderated_at = timezone.now()
        
        review.save()
        
        # Если не уникален - начисляем минимальные баллы сразу
        # Важно: награды начисляются только один раз при создании
        # Если модератор потом подтвердит этот отзыв, награды не начислятся повторно
        if not review.is_unique:
            reward_manager.award_review(
                review,
                is_unique=False,
                has_media=review.has_media
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def moderate(self, request, pk=None):
        """
        Модерация отзыва
        
        Body:
            {
                "action": "approve" | "soft_reject" | "spam_block",
                "comment": "Комментарий модератора"
            }
        
        Returns:
            Response с обновленным отзывом
        """
        review = self.get_object()
        moderation_service = ModerationService()
        
        # Валидируем данные
        serializer = ReviewModerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        comment = serializer.validated_data.get('comment', '')
        
        # Вызываем соответствующий метод модерации
        if action == 'approve':
            review, moderation_log = moderation_service.approve_review(
                review, request.user, comment
            )
        elif action == 'soft_reject':
            review, moderation_log = moderation_service.soft_reject_review(
                review, request.user, comment
            )
        elif action == 'spam_block':
            review, moderation_log = moderation_service.spam_block_review(
                review, request.user, comment
            )
        else:
            return Response(
                {'error': 'Неизвестное действие'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Сериализуем обновленный отзыв
        review_serializer = ReviewSerializer(review)
        return Response(review_serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def pending(self, request):
        """
        Получить список отзывов, ожидающих модерации
        
        Query params:
            - review_type: фильтр по типу
            - has_media: фильтр по наличию медиа
            - category: фильтр по категории
        
        Returns:
            Response со списком отзывов
        """
        moderation_service = ModerationService()
        
        # Получаем фильтры из query_params
        filters = {}
        if 'review_type' in request.query_params:
            filters['review_type'] = request.query_params['review_type']
        if 'has_media' in request.query_params:
            filters['has_media'] = request.query_params['has_media'].lower() == 'true'
        if 'category' in request.query_params:
            filters['category'] = request.query_params['category']
        
        # Получаем отзывы на модерацию
        reviews = moderation_service.get_pending_reviews(filters)
        
        # Применяем пагинацию
        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))
        total_count = reviews.count()
        reviews = reviews[offset:offset + limit]
        
        # Сериализуем
        serializer = ReviewSerializer(reviews, many=True)
        return Response({
            'count': total_count,
            'results': serializer.data
        })


class LeaderboardViewSet(viewsets.ViewSet):
    """
    ViewSet для таблиц лидеров
    
    Эндпоинты:
    - GET /api/gamification/leaderboard/global/ - глобальная таблица
    - GET /api/gamification/leaderboard/monthly/ - месячная таблица
    - GET /api/gamification/leaderboard/my-position/ - позиция текущего пользователя
    """
    # По умолчанию разрешаем доступ без авторизации, отдельные методы могут требовать авторизацию
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['get'], url_path='global', permission_classes=[AllowAny])
    def global_leaderboard(self, request):
        """
        Получить глобальную таблицу лидеров
        
        Query params:
            - limit: количество записей (по умолчанию 100)
            - offset: смещение
            - region: фильтр по региону
        
        Returns:
            Response с таблицей лидеров
        """
        leaderboard_service = LeaderboardService()
        
        # Получаем параметры
        limit = int(request.query_params.get('limit', 100))
        offset = int(request.query_params.get('offset', 0))
        region = request.query_params.get('region', None)
        
        # Получаем таблицу лидеров
        leaderboard = leaderboard_service.get_global_leaderboard(
            limit=limit,
            offset=offset,
            region=region
        )
        
        # Сериализуем
        serializer = LeaderboardEntrySerializer(leaderboard, many=True)
        return Response({
            'count': len(leaderboard),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='monthly', permission_classes=[AllowAny])
    def monthly_leaderboard(self, request):
        """
        Получить месячную таблицу лидеров
        
        Query params:
            - month: месяц (1-12)
            - year: год
            - limit: количество записей
            - offset: смещение
            - region: фильтр по региону
        
        Returns:
            Response с месячной таблицей лидеров
        """
        leaderboard_service = LeaderboardService()
        
        # Получаем параметры
        month = request.query_params.get('month', None)
        year = request.query_params.get('year', None)
        limit = int(request.query_params.get('limit', 100))
        offset = int(request.query_params.get('offset', 0))
        region = request.query_params.get('region', None)
        
        if month:
            month = int(month)
        if year:
            year = int(year)
        
        # Получаем таблицу лидеров
        leaderboard = leaderboard_service.get_monthly_leaderboard(
            month=month,
            year=year,
            limit=limit,
            offset=offset,
            region=region
        )
        
        # Сериализуем
        serializer = LeaderboardEntrySerializer(leaderboard, many=True)
        return Response({
            'count': len(leaderboard),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='my-position', permission_classes=[IsAuthenticated])
    def my_position(self, request):
        """
        Получить позицию текущего пользователя в таблицах лидеров
        
        Query params:
            - type: 'global' или 'monthly' (по умолчанию 'global')
        
        Returns:
            Response с позицией пользователя
        """
        leaderboard_service = LeaderboardService()
        
        # Получаем тип таблицы
        leaderboard_type = request.query_params.get('type', 'global')
        
        # Получаем позицию
        position = leaderboard_service.get_user_position(
            request.user,
            leaderboard_type=leaderboard_type
        )
        
        if position is None:
            return Response(
                {'error': 'Профиль пользователя не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'position': position,
            'leaderboard_type': leaderboard_type
        })


class RewardViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для наград в маркетплейсе
    
    Эндпоинты:
    - GET /api/gamification/rewards/ - каталог наград
    - GET /api/gamification/rewards/{id}/ - детали награды
    - POST /api/gamification/rewards/{id}/purchase/ - покупка награды
    """
    queryset = Reward.objects.filter(is_available=True)
    serializer_class = RewardSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'])
    def purchase(self, request, pk=None):
        """
        Покупка награды
        
        Returns:
            Response с купленной наградой (UserReward)
        """
        from gamification.utils import get_or_create_user_profile
        from django.utils import timezone as tz
        
        reward = self.get_object()
        reward_manager = RewardManager()
        
        # Проверка блокировки аккаунта
        user_profile = get_or_create_user_profile(request.user)
        if user_profile.is_banned:
            if user_profile.banned_until and user_profile.banned_until > tz.now():
                return Response(
                    {'error': f'Ваш аккаунт заблокирован до {user_profile.banned_until.strftime("%d.%m.%Y %H:%M")}'},
                    status=status.HTTP_403_FORBIDDEN
                )
            elif user_profile.banned_until is None:
                return Response(
                    {'error': 'Ваш аккаунт заблокирован. Обратитесь в поддержку.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        try:
            user_reward, transaction = reward_manager.purchase_reward(request.user, reward)
            serializer = UserRewardSerializer(user_reward)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Произошла ошибка при покупке награды: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserRewardViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для наград пользователя
    
    Эндпоинты:
    - GET /api/gamification/my-rewards/ - награды текущего пользователя
    - GET /api/gamification/my-rewards/{id}/ - детали награды
    - POST /api/gamification/my-rewards/{id}/use/ - отметить награду как использованную
    """
    serializer_class = UserRewardSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Получить награды только текущего пользователя
        """
        return UserReward.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def use(self, request, pk=None):
        """
        Отметить награду как использованную
        
        Returns:
            Response с обновленной наградой
        """
        user_reward = self.get_object()
        
        # Проверяем, что награда принадлежит текущему пользователю
        if user_reward.user != request.user:
            return Response(
                {'error': 'Награда не принадлежит текущему пользователю'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Обновляем статус
        user_reward.status = 'used'
        user_reward.used_at = timezone.now()
        user_reward.save()
        
        # Сериализуем
        serializer = self.get_serializer(user_reward)
        return Response(serializer.data)


class AchievementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для достижений
    
    Эндпоинты:
    - GET /api/gamification/achievements/ - каталог достижений
    - GET /api/gamification/achievements/{id}/ - детали достижения
    """
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer
    permission_classes = [IsAuthenticated]

