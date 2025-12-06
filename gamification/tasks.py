"""
Celery задачи для модуля геймификации

Используется для:
- Ежемесячного сброса показателей
- Автоматической проверки достижений
- Отправки уведомлений
- Периодических задач
"""

from celery import shared_task
from django.utils import timezone
from django.conf import settings
from datetime import datetime, timedelta
from gamification.models import UserProfile, RewardTransaction
from gamification.services.reward_manager import RewardManager
from gamification.services.leaderboard_service import LeaderboardService
from gamification.utils import get_or_create_user_profile
import logging

logger = logging.getLogger(__name__)


@shared_task
def monthly_reset():
    """
    Ежемесячный сброс показателей
    
    Выполняется первого числа каждого месяца в полночь.
    
    Действия:
    1. Обнуление месячного рейтинга для всех пользователей
    2. Конвертация части баллов в рейтинг (согласно коэффициенту)
    3. Обнуление или частичное списание баллов
    4. Отправка уведомлений пользователям
    5. Формирование таблицы лидеров за прошедший месяц
    """
    reward_manager = RewardManager()
    leaderboard_service = LeaderboardService()
    
    # Получаем коэффициент конвертации
    conversion_rate = settings.GAMIFICATION_CONFIG.get('POINTS_TO_REPUTATION_RATE', 0.1)
    
    # Получаем всех пользователей с профилями
    profiles = UserProfile.objects.all()
    total_users = profiles.count()
    processed_users = 0
    
    logger.info(f"Начало ежемесячного сброса для {total_users} пользователей")
    
    for profile in profiles:
        try:
            # Сохраняем месячный рейтинг (можно сохранить в историю, если нужно)
            monthly_reputation_before = profile.monthly_reputation
            
            # Конвертируем часть баллов в репутацию
            if profile.points_balance > 0:
                points_to_convert = int(profile.points_balance * conversion_rate)
                reputation_from_points = int(points_to_convert * 10)  # 1 балл = 10 репутации
                
                # Обновляем репутацию
                profile.total_reputation += reputation_from_points
                
                # Списываем конвертированные баллы
                profile.points_balance -= points_to_convert
                
                # Создаем транзакцию конвертации
                RewardTransaction.objects.create(
                    user=profile.user,
                    transaction_type='debit',
                    amount=points_to_convert,
                    reason='monthly_conversion',
                    balance_after=profile.points_balance,
                    metadata={
                        'reputation_gained': reputation_from_points,
                        'conversion_rate': conversion_rate,
                    }
                )
            
            # Обнуляем месячный рейтинг
            profile.monthly_reputation = 0
            profile.save()
            
            processed_users += 1
            
        except Exception as e:
            logger.error(f"Ошибка при обработке пользователя {profile.user.username}: {str(e)}")
            continue
    
    # Получаем топ N пользователей за прошедший месяц
    top_n = settings.GAMIFICATION_CONFIG.get('MONTHLY_LEADERBOARD_TOP_N', 10)
    top_users = leaderboard_service.get_top_n_users(n=top_n, leaderboard_type='monthly')
    
    logger.info(f"Ежемесячный сброс завершен. Обработано: {processed_users}/{total_users}")
    logger.info(f"Топ {top_n} пользователей за месяц: {len(top_users)}")
    
    # Отправляем уведомления (можно реализовать позже)
    # send_monthly_leaderboard_notifications.delay()
    
    return {
        'processed_users': processed_users,
        'total_users': total_users,
        'top_users_count': len(top_users)
    }


@shared_task
def check_achievements(user_id):
    """
    Проверка и начисление достижений для пользователя
    
    Args:
        user_id: ID пользователя
    
    Вызывается после:
    - Создания отзыва
    - Подтверждения отзыва
    - Достижения определенного уровня репутации
    """
    from django.contrib.auth.models import User
    from gamification.models import Achievement, UserAchievement
    
    try:
        user = User.objects.get(pk=user_id)
        user_profile = get_or_create_user_profile(user)
        reward_manager = RewardManager()
        
        # Получаем все достижения
        achievements = Achievement.objects.all()
        new_achievements = []
        
        for achievement in achievements:
            # Проверяем, не получено ли уже это достижение
            if UserAchievement.objects.filter(user=user, achievement=achievement).exists():
                continue
            
            # Проверяем условие достижения (упрощенная версия)
            # В реальной системе условие может быть более сложным (JSON с правилами)
            condition_met = False
            
            # Примеры условий (можно расширить)
            if 'unique_reviews' in achievement.condition.lower():
                required_count = 10  # Пример
                if user_profile.unique_reviews_count >= required_count:
                    condition_met = True
            
            elif 'reputation' in achievement.condition.lower():
                required_reputation = 1000  # Пример
                if user_profile.total_reputation >= required_reputation:
                    condition_met = True
            
            elif 'level' in achievement.condition.lower():
                required_level = 5  # Пример
                if user_profile.level >= required_level:
                    condition_met = True
            
            # Если условие выполнено - начисляем достижение
            if condition_met:
                UserAchievement.objects.create(
                    user=user,
                    achievement=achievement,
                    progress=100
                )
                
                # Начисляем бонусные баллы и репутацию
                if achievement.bonus_points > 0 or achievement.bonus_reputation > 0:
                    reward_manager.award_points(
                        user,
                        points=achievement.bonus_points,
                        reputation=achievement.bonus_reputation,
                        reason='achievement_bonus'
                    )
                
                new_achievements.append(achievement.name)
        
        logger.info(f"Проверка достижений для пользователя {user.username}: получено {len(new_achievements)} новых")
        return {'new_achievements': new_achievements}
        
    except User.DoesNotExist:
        logger.error(f"Пользователь с ID {user_id} не найден")
        return {'error': 'User not found'}
    except Exception as e:
        logger.error(f"Ошибка при проверке достижений для пользователя {user_id}: {str(e)}")
        return {'error': str(e)}


@shared_task
def send_monthly_leaderboard_notifications():
    """
    Отправка уведомлений топ пользователям месячного рейтинга
    
    Вызывается после monthly_reset
    """
    leaderboard_service = LeaderboardService()
    top_n = settings.GAMIFICATION_CONFIG.get('MONTHLY_LEADERBOARD_TOP_N', 10)
    
    # Получаем топ пользователей
    top_users = leaderboard_service.get_top_n_users(n=top_n, leaderboard_type='monthly')
    
    logger.info(f"Отправка уведомлений топ {len(top_users)} пользователям")
    
    # В реальной системе здесь будет отправка уведомлений
    # Например, через email, push-уведомления или in-app уведомления
    for entry in top_users:
        try:
            # Пример отправки уведомления (заглушка)
            # send_notification(
            #     user_id=entry['user_uuid'],
            #     message=f"Поздравляем! Вы заняли {entry['rank']} место в месячном рейтинге!"
            # )
            logger.info(f"Уведомление отправлено пользователю {entry['username']} (позиция {entry['rank']})")
        except Exception as e:
            logger.error(f"Ошибка при отправке уведомления пользователю {entry.get('username', 'unknown')}: {str(e)}")
    
    return {'notifications_sent': len(top_users)}


@shared_task
def cleanup_old_transactions():
    """
    Очистка старых транзакций (опционально)
    
    Удаляет транзакции старше определенного периода
    для оптимизации базы данных
    """
    # Период хранения (2 года)
    retention_period = timedelta(days=730)
    cutoff_date = timezone.now() - retention_period
    
    # Находим старые транзакции
    old_transactions = RewardTransaction.objects.filter(created_at__lt=cutoff_date)
    count = old_transactions.count()
    
    if count > 0:
        # В реальной системе лучше архивировать, а не удалять
        # old_transactions.delete()
        logger.info(f"Найдено {count} старых транзакций для архивации (старше {cutoff_date.date()})")
        # Пока не удаляем, только логируем
    else:
        logger.info("Старых транзакций для очистки не найдено")
    
    return {'old_transactions_count': count}


@shared_task
def recalculate_user_levels():
    """
    Пересчет уровней всех пользователей
    
    Вызывается периодически для синхронизации уровней
    """
    reward_manager = RewardManager()
    profiles = UserProfile.objects.all()
    updated_count = 0
    
    logger.info(f"Начало пересчета уровней для {profiles.count()} пользователей")
    
    for profile in profiles:
        try:
            old_level = profile.level
            new_level = reward_manager._update_user_level(profile)
            
            if new_level != old_level:
                updated_count += 1
                logger.debug(f"Уровень пользователя {profile.user.username} обновлен: {old_level} -> {new_level}")
        except Exception as e:
            logger.error(f"Ошибка при пересчете уровня для пользователя {profile.user.username}: {str(e)}")
            continue
    
    logger.info(f"Пересчет уровней завершен. Обновлено: {updated_count} пользователей")
    return {'updated_count': updated_count, 'total_count': profiles.count()}

