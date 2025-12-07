#!/usr/bin/env python
"""
Скрипт для обогащения базы данных тестовыми данными
Заполняет пустые разделы и добавляет дополнительные данные
"""

import os
import django
from django.utils import timezone
from datetime import timedelta
import random

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'health_map.settings')
django.setup()

from django.contrib.auth.models import User
from gamification.models import (
    UserProfile, Review, RewardTransaction, Reward, UserReward,
    Achievement, UserAchievement, ModerationLog
)
from maps.models import POI, POICategory, AreaAnalysis
from gamification.utils import get_or_create_user_profile
from decimal import Decimal

def enrich_database():
    """Обогащает базу данных дополнительными данными"""
    
    print("=" * 70)
    print("ОБОГАЩЕНИЕ БАЗЫ ДАННЫХ")
    print("=" * 70)
    
    # Получаем существующих пользователей
    users = list(User.objects.all())
    if not users:
        print("❌ Нет пользователей в базе! Сначала запустите load_test_data.py")
        return
    
    # Получаем существующие данные
    existing_rewards = list(Reward.objects.all())
    existing_achievements = list(Achievement.objects.all())
    existing_pois = list(POI.objects.all())
    
    # 1. Добавляем больше отзывов
    print("\n1. Добавление дополнительных отзывов...")
    moscow_coords = [
        (55.7520, 37.6156), (55.7517, 37.5739), (55.7516, 37.6173),
        (55.7539, 37.6208), (55.7608, 37.6235), (55.7576, 37.6126),
        (55.7555, 37.6422), (55.7575, 37.6160), (55.7595, 37.6095),
        (55.7592, 37.6325), (55.7158, 37.5547), (55.7556, 37.6236),
        (55.7605, 37.6220), (55.7640, 37.6145), (55.7580, 37.6105),
    ]
    
    categories = ['Спорт', 'Питание', 'Медицина', 'Аптека', 'Фитнес', 
                  'Кафе', 'Ресторан', 'Клиника', 'Поликлиника', 'Спортзал']
    
    review_texts = [
        "Отличное место для занятий спортом! Очень чисто и просторно.",
        "Вкусная и здоровая еда. Рекомендую всем, кто следит за питанием.",
        "Профессиональный медицинский персонал. Качественное обслуживание.",
        "Всегда нахожу нужные лекарства. Консультация фармацевта очень помогла.",
        "Современный фитнес-клуб с хорошим оборудованием.",
        "Уютное кафе с полезными блюдами. Приятная атмосфера.",
        "Ресторан здорового питания - один из лучших в городе!",
        "Клиника с отличной репутацией. Квалифицированные врачи.",
        "Поликлиника работает слаженно, без долгих очередей.",
        "Спортзал оборудован всем необходимым для полноценных тренировок.",
    ]
    
    reviews_created = 0
    for i in range(15):
        user = random.choice(users)
        lat, lon = random.choice(moscow_coords)
        category = random.choice(categories)
        review_type = random.choice(['poi_review', 'incident'])
        has_media = random.choice([True, False])
        is_unique = random.choice([True, False])
        
        status = random.choice(['pending', 'approved', 'approved', 'approved'])
        
        review = Review.objects.create(
            author=user,
            review_type=review_type,
            latitude=lat,
            longitude=lon,
            category=category,
            content=random.choice(review_texts) + f" Координаты: {lat}, {lon}",
            has_media=has_media,
            is_unique=is_unique,
            moderation_status=status
        )
        reviews_created += 1
        print(f"   ✓ Создан отзыв #{reviews_created}: {review_type} ({status})")
    
    # 2. Добавляем транзакции
    print("\n2. Добавление транзакций...")
    transaction_reasons = [
        'unique_review_approved', 'duplicate_review', 'reward_purchase',
        'achievement_bonus', 'monthly_conversion', 'spam_penalty'
    ]
    
    transactions_created = 0
    for user in users[:5]:
        profile = get_or_create_user_profile(user)
        
        # Кредитные транзакции
        for _ in range(2):
            transaction = RewardTransaction.objects.create(
                user=user,
                transaction_type='credit',
                amount=random.randint(50, 500),
                reason=random.choice(transaction_reasons[:4]),
                balance_after=profile.points_balance,
                metadata={'source': 'enrichment_script'}
            )
            transactions_created += 1
        
        # Дебетные транзакции (покупки)
        if profile.points_balance > 100:
            transaction = RewardTransaction.objects.create(
                user=user,
                transaction_type='debit',
                amount=random.randint(100, min(500, int(profile.points_balance))),
                reason='reward_purchase',
                balance_after=profile.points_balance,
                metadata={'source': 'enrichment_script'}
            )
            transactions_created += 1
    
    print(f"   ✓ Создано транзакций: {transactions_created}")
    
    # 3. Добавляем награды пользователям
    print("\n3. Добавление наград пользователям...")
    user_rewards_created = 0
    for user in users:
        if not existing_rewards:
            break
        
        # Добавляем 1-2 награды каждому пользователю
        available_rewards = [r for r in existing_rewards if not UserReward.objects.filter(user=user, reward=r).exists()]
        if available_rewards:
            reward = random.choice(available_rewards)
            status = random.choice(['active', 'active', 'used'])
            used_at = timezone.now() - timedelta(days=random.randint(1, 30)) if status == 'used' else None
            
            UserReward.objects.create(
                user=user,
                reward=reward,
                status=status,
                used_at=used_at,
                metadata={'source': 'enrichment_script'}
            )
            user_rewards_created += 1
            print(f"   ✓ Награда '{reward.name}' добавлена пользователю {user.username}")
    
    print(f"   ✓ Всего наград пользователям: {user_rewards_created}")
    
    # 4. Добавляем достижения пользователям
    print("\n4. Добавление достижений пользователям...")
    user_achievements_created = 0
    for user in users:
        if not existing_achievements:
            break
        
        available_achievements = [a for a in existing_achievements 
                                 if not UserAchievement.objects.filter(user=user, achievement=a).exists()]
        if available_achievements:
            achievement = random.choice(available_achievements)
            
            UserAchievement.objects.create(
                user=user,
                achievement=achievement,
                progress=100
            )
            user_achievements_created += 1
            print(f"   ✓ Достижение '{achievement.name}' добавлено пользователю {user.username}")
    
    print(f"   ✓ Всего достижений пользователям: {user_achievements_created}")
    
    # 5. Добавляем логи модерации
    print("\n5. Добавление логов модерации...")
    reviews = list(Review.objects.all())
    moderator = users[0] if users else None
    
    logs_created = 0
    for review in reviews[:10]:
        if not ModerationLog.objects.filter(review=review).exists():
            action = random.choice(['approved', 'soft_rejected', 'spam_blocked', 'approved'])
            
            ModerationLog.objects.create(
                moderator=moderator,
                review=review,
                action=action,
                comment=f'Лог модерации: {action}',
                processing_time=random.uniform(0.5, 3.0)
            )
            logs_created += 1
    
    print(f"   ✓ Создано логов модерации: {logs_created}")
    
    # 6. Создаем анализы областей
    print("\n6. Создание анализов областей...")
    if existing_pois:
        # Создаем несколько анализов для разных областей Москвы
        analysis_areas = [
            {
                'name': 'Центр Москвы',
                'sw_lat': Decimal('55.7500'),
                'sw_lon': Decimal('37.6000'),
                'ne_lat': Decimal('55.7700'),
                'ne_lon': Decimal('37.6400'),
            },
            {
                'name': 'Северо-запад Москвы',
                'sw_lat': Decimal('55.7700'),
                'sw_lon': Decimal('37.5500'),
                'ne_lat': Decimal('55.7900'),
                'ne_lon': Decimal('37.6000'),
            },
            {
                'name': 'Юг Москвы',
                'sw_lat': Decimal('55.7000'),
                'sw_lon': Decimal('37.5500'),
                'ne_lat': Decimal('55.7500'),
                'ne_lon': Decimal('37.6000'),
            },
        ]
        
        analyses_created = 0
        for area in analysis_areas:
            # Находим POI в этой области
            pois_in_area = POI.objects.filter(
                latitude__gte=float(area['sw_lat']),
                latitude__lte=float(area['ne_lat']),
                longitude__gte=float(area['sw_lon']),
                longitude__lte=float(area['ne_lon'])
            )
            
            if pois_in_area.exists():
                # Рассчитываем простой индекс здоровья
                health_scores = []
                category_counts = {}
                
                for poi in pois_in_area:
                    if hasattr(poi, 'rating') and poi.rating:
                        health_scores.append(float(poi.rating.health_score))
                    
                    cat_slug = poi.category.slug if poi.category else 'other'
                    category_counts[cat_slug] = category_counts.get(cat_slug, 0) + 1
                
                avg_health = sum(health_scores) / len(health_scores) if health_scores else 50.0
                
                analysis = AreaAnalysis.objects.create(
                    analysis_type='city',
                    area_name=area['name'],
                    area_params={
                        'sw_lat': float(area['sw_lat']),
                        'sw_lon': float(area['sw_lon']),
                        'ne_lat': float(area['ne_lat']),
                        'ne_lon': float(area['ne_lon']),
                    },
                    active_filters=[],
                    health_index=round(avg_health, 2),
                    category_stats={
                        'total': pois_in_area.count(),
                        'average_health': round(avg_health, 2),
                        'by_category': category_counts
                    },
                    objects_count=pois_in_area.count(),
                    user=users[0] if users else None
                )
                analyses_created += 1
                print(f"   ✓ Создан анализ области: {area['name']} (индекс: {round(avg_health, 2)}, объектов: {pois_in_area.count()})")
        
        print(f"   ✓ Всего создано анализов областей: {analyses_created}")
    else:
        print("   ⚠️ Нет POI для создания анализов областей")
    
    # Итоговая статистика
    print("\n" + "=" * 70)
    print("ИТОГОВАЯ СТАТИСТИКА ПОСЛЕ ОБОГАЩЕНИЯ:")
    print("=" * 70)
    print(f"✓ Пользователей: {User.objects.count()}")
    print(f"✓ Профилей: {UserProfile.objects.count()}")
    print(f"✓ Отзывов: {Review.objects.count()}")
    print(f"✓ Наград: {Reward.objects.count()}")
    print(f"✓ Достижений: {Achievement.objects.count()}")
    print(f"✓ Наград у пользователей: {UserReward.objects.count()}")
    print(f"✓ Достижений у пользователей: {UserAchievement.objects.count()}")
    print(f"✓ Транзакций: {RewardTransaction.objects.count()}")
    print(f"✓ Логов модерации: {ModerationLog.objects.count()}")
    print(f"✓ POI: {POI.objects.count()}")
    print(f"✓ Анализов областей: {AreaAnalysis.objects.count()}")
    print("=" * 70)
    print("\n✅ База данных успешно обогащена!")
    print()

if __name__ == '__main__':
    enrich_database()

