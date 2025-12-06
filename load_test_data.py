#!/usr/bin/env python
"""
Скрипт для загрузки тестовых данных в базу данных
Создает тестовые записи для всех моделей геймификации
"""

import os
import django
from django.utils import timezone
from datetime import timedelta

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'health_map.settings')
django.setup()

from django.contrib.auth.models import User
from gamification.models import (
    UserProfile, Review, RewardTransaction, Reward, UserReward,
    Achievement, UserAchievement, ModerationLog
)
from gamification.utils import get_or_create_user_profile

def create_test_data():
    """Создает тестовые данные для всех моделей"""
    
    print("=" * 60)
    print("Загрузка тестовых данных в базу данных")
    print("=" * 60)
    
    # Координаты Москвы
    MOSCOW_COORDS = [
        (55.7558, 37.6173),  # Красная площадь
        (55.7520, 37.6156),  # Кремль
        (55.7517, 37.5739),  # Парк Горького
        (55.7516, 37.6173),  # ГУМ
        (55.7539, 37.6208),  # Большой театр
    ]
    
    categories = [
        'Спорт', 'Питание', 'Медицина', 'Аптека', 'Фитнес',
        'Кафе', 'Ресторан', 'Клиника', 'Поликлиника', 'Спортзал'
    ]
    
    # 1. Создаем тестовых пользователей и профили
    print("\n1. Создание пользователей и профилей...")
    users = []
    for i in range(5):
        username = f'testuser{i+1}'
        email = f'testuser{i+1}@example.com'
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': f'Тестовый {i+1}',
                'last_name': 'Пользователь'
            }
        )
        if created:
            user.set_password('test123')
            user.save()
            print(f"   ✓ Создан пользователь: {username}")
        else:
            print(f"   → Пользователь уже существует: {username}")
        
        # Создаем или получаем профиль
        profile = get_or_create_user_profile(user)
        if created:
            # Устанавливаем разные уровни для разных пользователей
            profile.total_reputation = (i + 1) * 100
            profile.monthly_reputation = (i + 1) * 50
            profile.points_balance = (i + 1) * 200
            profile.level = i + 1
            profile.unique_reviews_count = i + 1
            profile.save()
            print(f"   ✓ Профиль создан с репутацией: {profile.total_reputation}")
        
        users.append(user)
    
    # 2. Создаем отзывы (Reviews)
    print("\n2. Создание отзывов...")
    review_types = ['poi_review', 'incident']
    reviews = []
    
    for i, user in enumerate(users[:3]):  # Создаем отзывы от первых 3 пользователей
        lat, lon = MOSCOW_COORDS[i % len(MOSCOW_COORDS)]
        review_type = review_types[i % 2]
        category = categories[i % len(categories)]
        
        # Создаем разные отзывы с разными статусами
        statuses = ['pending', 'approved', 'soft_reject', 'approved']
        status = statuses[i % len(statuses)]
        
        review = Review.objects.create(
            author=user,
            review_type=review_type,
            latitude=lat,
            longitude=lon,
            category=category,
            content=('Тестовый отзыв от пользователя ' + user.username + '. ' +
                   ('Это инцидент' if review_type == 'incident' else 'Это отзыв о заведении') + ' ' +
                   f'в категории {category}. Координаты: {lat}, {lon}'),
            has_media=(i % 2 == 0),
            is_unique=(i % 2 == 0),
            moderation_status=status
        )
        reviews.append(review)
        print(f"   ✓ Создан отзыв: {review.review_type} ({status}) от {user.username}")
    
    # 3. Создаем награды (Rewards)
    print("\n3. Создание наград...")
    reward_types = ['coupon', 'digital_merch', 'physical_merch', 'privilege']
    reward_names = [
        'Скидка 20% в фитнес-клубе',
        'Значок "Активист"',
        'Футболка "Карта здоровья"',
        'Приоритетная поддержка',
        'Билет в кинотеатр',
    ]
    rewards = []
    
    for i in range(5):
        reward = Reward.objects.create(
            name=reward_names[i],
            description=f'Описание награды: {reward_names[i]}. ' +
                       f'Замечательная награда для активных пользователей.',
            reward_type=reward_types[i % len(reward_types)],
            points_cost=(i + 1) * 100,
            is_available=True,
            stock_quantity=10 + i * 5 if i < 3 else None,
            partner_name=f'Партнер {i + 1}' if i < 3 else '',
            metadata={'bonus': i * 10}
        )
        rewards.append(reward)
        print(f"   ✓ Создана награда: {reward.name} ({reward.points_cost} баллов)")
    
    # 4. Создаем достижения (Achievements)
    print("\n4. Создание достижений...")
    rarity_levels = ['common', 'rare', 'epic', 'legendary']
    achievement_names = [
        'Первый отзыв',
        '10 уникальных отзывов',
        'Активист месяца',
        'Легенда здоровья',
        'Эксперт модерации',
    ]
    achievements = []
    
    for i in range(5):
        achievement = Achievement.objects.create(
            name=achievement_names[i],
            description=f'Получите это достижение за: {achievement_names[i]}. ' +
                       f'Условие: выполнить определенные действия в системе.',
            condition=f'Проверка условия для {achievement_names[i]}',
            bonus_points=(i + 1) * 50,
            bonus_reputation=(i + 1) * 25,
            rarity=rarity_levels[i % len(rarity_levels)]
        )
        achievements.append(achievement)
        print(f"   ✓ Создано достижение: {achievement.name} ({achievement.rarity})")
    
    # 5. Создаем UserReward (награды пользователей)
    print("\n5. Создание наград пользователей...")
    for i, user in enumerate(users[:3]):
        if i < len(rewards):
            user_reward = UserReward.objects.create(
                user=user,
                reward=rewards[i],
                status='active' if i < 2 else 'used',
                used_at=timezone.now() - timedelta(days=i) if i >= 2 else None,
                metadata={'purchase_date': str(timezone.now().date())}
            )
            print(f"   ✓ Создана награда пользователя: {user.username} - {rewards[i].name}")
    
    # 6. Создаем UserAchievement (достижения пользователей)
    print("\n6. Создание достижений пользователей...")
    for i, user in enumerate(users[:3]):
        if i < len(achievements):
            user_achievement = UserAchievement.objects.create(
                user=user,
                achievement=achievements[i],
                progress=100
            )
            print(f"   ✓ Создано достижение пользователя: {user.username} - {achievements[i].name}")
    
    # 7. Создаем транзакции (RewardTransactions)
    print("\n7. Создание транзакций...")
    transaction_reasons = [
        'unique_review_approved',
        'duplicate_review',
        'reward_purchase',
        'achievement_bonus',
        'monthly_conversion',
    ]
    
    for i, user in enumerate(users[:3]):
        profile = get_or_create_user_profile(user)
        review = reviews[i] if i < len(reviews) else None
        
        transaction = RewardTransaction.objects.create(
            user=user,
            transaction_type='credit' if i < 2 else 'debit',
            amount=(i + 1) * 100,
            reason=transaction_reasons[i % len(transaction_reasons)],
            review=review,
            balance_after=profile.points_balance,
            metadata={
                'test': True,
                'created_by': 'test_script'
            }
        )
        print(f"   ✓ Создана транзакция: {user.username} - {transaction.get_reason_display()}")
    
    # 8. Создаем логи модерации (ModerationLog)
    print("\n8. Создание логов модерации...")
    actions = ['approved', 'soft_rejected', 'spam_blocked']
    moderator = users[0]  # Используем первого пользователя как модератора
    
    for i, review in enumerate(reviews[:3]):
        action = actions[i % len(actions)]
        log = ModerationLog.objects.create(
            moderator=moderator,
            review=review,
            action=action,
            comment=f'Тестовый комментарий модератора для отзыва {i + 1}',
            processing_time=1.5 + i * 0.3
        )
        print(f"   ✓ Создан лог модерации: {action} для отзыва {i + 1}")
    
    # Итоговая статистика
    print("\n" + "=" * 60)
    print("ИТОГОВАЯ СТАТИСТИКА:")
    print("=" * 60)
    print(f"✓ Пользователей: {User.objects.count()}")
    print(f"✓ Профилей: {UserProfile.objects.count()}")
    print(f"✓ Отзывов: {Review.objects.count()}")
    print(f"✓ Наград: {Reward.objects.count()}")
    print(f"✓ Достижений: {Achievement.objects.count()}")
    print(f"✓ Наград пользователей: {UserReward.objects.count()}")
    print(f"✓ Достижений пользователей: {UserAchievement.objects.count()}")
    print(f"✓ Транзакций: {RewardTransaction.objects.count()}")
    print(f"✓ Логов модерации: {ModerationLog.objects.count()}")
    print("=" * 60)
    print("\n✅ Все тестовые данные успешно загружены!")
    
    print("\n📝 Данные для входа в админку:")
    print(f"   Username: admin")
    print(f"   Password: admin123")
    print("\n📝 Тестовые пользователи:")
    for user in users:
        print(f"   Username: {user.username}, Password: test123")

if __name__ == '__main__':
    create_test_data()

