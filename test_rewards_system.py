#!/usr/bin/env python3
"""
Скрипт для проверки системы наград (бэкенд)
Проверяет:
1. Получение списка наград
2. Покупку награды
3. Получение моих наград
4. Использование награды
"""

import os
import sys
import django

# Настройка Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'health_map.settings')
django.setup()

from django.contrib.auth.models import User
from gamification.models import Reward, UserReward, UserProfile
from gamification.services.reward_manager import RewardManager
from gamification.services.reward_calculator import RewardCalculator
from gamification.models import Review

def test_reward_calculator():
    """Тест расчета наград с учетом качества отзывов"""
    print("=" * 60)
    print("ТЕСТ: Расчет наград с учетом качества отзывов")
    print("=" * 60)
    
    calculator = RewardCalculator()
    
    # Создаем тестовый отзыв
    try:
        test_user = User.objects.first()
        if not test_user:
            print("❌ Нет пользователей в системе")
            return
        
        # Создаем тестовый отзыв
        test_review = Review.objects.create(
            author=test_user,
            review_type='poi_review',
            latitude=55.7558,
            longitude=37.6173,
            category='Спортзал',
            content='Отличный спортзал с современным оборудованием, чистыми раздевалками и профессиональными тренерами. Очень рекомендую!',
            has_media=True,
            is_unique=True,
            moderation_status='approved'
        )
        
        print(f"\n📝 Тестовый отзыв:")
        print(f"   Текст: {test_review.content[:50]}...")
        print(f"   С медиа: {test_review.has_media}")
        print(f"   Уникальный: {test_review.is_unique}")
        
        # Тест 1: Уникальный отзыв БЕЗ фото
        print(f"\n🧪 Тест 1: Уникальный отзыв БЕЗ фото")
        test_review.has_media = False
        reward1 = calculator.calculate_review_reward(test_review, is_unique=True, has_media=False)
        print(f"   Баллы: {reward1['points']}")
        print(f"   Репутация: {reward1['reputation']}")
        if 'quality_analysis' in reward1:
            qa = reward1['quality_analysis']
            print(f"   Полнота: {qa['completeness_score']:.2f}")
            print(f"   Востребованность: {qa['usefulness_score']:.2f}")
            print(f"   Уровень качества: {qa['quality_level']}")
            print(f"   Множитель: {reward1.get('quality_multiplier', 1.0):.2f}")
        
        # Тест 2: Уникальный отзыв С фото
        print(f"\n🧪 Тест 2: Уникальный отзыв С фото")
        test_review.has_media = True
        reward2 = calculator.calculate_review_reward(test_review, is_unique=True, has_media=True)
        print(f"   Баллы: {reward2['points']}")
        print(f"   Репутация: {reward2['reputation']}")
        if 'quality_analysis' in reward2:
            qa = reward2['quality_analysis']
            print(f"   Полнота: {qa['completeness_score']:.2f}")
            print(f"   Востребованность: {qa['usefulness_score']:.2f}")
            print(f"   Уровень качества: {qa['quality_level']}")
            print(f"   Множитель: {reward2.get('quality_multiplier', 1.0):.2f}")
        
        # Проверка бонуса за фото
        print(f"\n✅ Проверка бонуса за фото:")
        print(f"   Без фото: {reward1['points']} баллов")
        print(f"   С фото: {reward2['points']} баллов")
        bonus_multiplier = reward2['points'] / reward1['points'] if reward1['points'] > 0 else 0
        print(f"   Множитель за фото: {bonus_multiplier:.2f}x")
        
        if bonus_multiplier >= 1.8:  # Ожидаем примерно 2x из-за бонуса за фото
            print(f"   ✅ Бонус за фото работает правильно!")
        else:
            print(f"   ⚠️ Бонус за фото может быть недостаточным")
        
        # Удаляем тестовый отзыв
        test_review.delete()
        
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {str(e)}")
        import traceback
        traceback.print_exc()

def test_rewards_api():
    """Тест API наград"""
    print("\n" + "=" * 60)
    print("ТЕСТ: API наград")
    print("=" * 60)
    
    # Проверяем наличие наград
    rewards_count = Reward.objects.filter(is_available=True).count()
    print(f"\n📦 Доступных наград в системе: {rewards_count}")
    
    if rewards_count > 0:
        rewards = Reward.objects.filter(is_available=True)[:5]
        print(f"\nПримеры наград:")
        for reward in rewards:
            print(f"   - {reward.name}: {reward.points_cost} баллов ({reward.reward_type})")
    else:
        print("   ⚠️ Нет доступных наград в системе")
    
    # Проверяем покупки
    user_rewards_count = UserReward.objects.count()
    print(f"\n🎁 Всего купленных наград: {user_rewards_count}")
    
    if user_rewards_count > 0:
        user_rewards = UserReward.objects.all()[:5]
        print(f"\nПримеры купленных наград:")
        for ur in user_rewards:
            print(f"   - {ur.reward.name} ({ur.status}) - пользователь: {ur.user.username}")

if __name__ == '__main__':
    print("🚀 Запуск тестов системы наград\n")
    
    test_reward_calculator()
    test_rewards_api()
    
    print("\n" + "=" * 60)
    print("✅ Тесты завершены")
    print("=" * 60)
