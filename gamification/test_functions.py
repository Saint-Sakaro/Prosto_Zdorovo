"""
Простой скрипт для проверки работы основных функций модуля геймификации

Запуск: python manage.py shell < gamification/test_functions.py
Или: python manage.py shell, затем выполнить функции вручную
"""

def test_uniqueness_checker():
    """Тест проверки уникальности"""
    from gamification.services.uniqueness_checker import UniquenessChecker
    
    checker = UniquenessChecker()
    
    # Тест расчета расстояния
    distance = checker.calculate_distance(55.7558, 37.6173, 55.7559, 37.6174)
    print(f"✓ Расчет расстояния работает: {distance:.2f} метров")
    
    # Тест проверки уникальности (без БД)
    result = checker.check_uniqueness(
        latitude=55.7558,
        longitude=37.6173,
        category='test',
        review_type='poi_review'
    )
    print(f"✓ Проверка уникальности работает: is_unique={result['is_unique']}")
    
    return True


def test_reward_calculator():
    """Тест расчета наград"""
    from gamification.services.reward_calculator import RewardCalculator
    from gamification.models import Review
    from django.contrib.auth.models import User
    
    calculator = RewardCalculator()
    
    # Создаем тестовый отзыв (без сохранения в БД)
    class MockReview:
        review_type = 'poi_review'
    
    review = MockReview()
    
    # Тест расчета награды за уникальный отзыв
    reward = calculator.calculate_review_reward(review, is_unique=True, has_media=True)
    print(f"✓ Расчет награды за уникальный отзыв: {reward}")
    
    # Тест расчета награды за дубликат
    reward_dup = calculator.calculate_review_reward(review, is_unique=False, has_media=False)
    print(f"✓ Расчет награды за дубликат: {reward_dup}")
    
    # Тест бонуса за медиа
    bonus = calculator.apply_media_bonus(100, 50)
    print(f"✓ Бонус за медиа: {bonus}")
    
    # Тест штрафа за спам
    penalty = calculator.calculate_spam_penalty()
    print(f"✓ Штраф за спам: {penalty}")
    
    return True


def test_utils():
    """Тест утилит"""
    from gamification.utils import (
        calculate_level_from_reputation,
        format_reputation,
        validate_coordinates
    )
    
    # Тест расчета уровня
    level = calculate_level_from_reputation(1000, 10)
    print(f"✓ Расчет уровня: reputation=1000 -> level={level}")
    
    # Тест форматирования репутации
    formatted = format_reputation(1500)
    print(f"✓ Форматирование репутации: 1500 -> {formatted}")
    
    # Тест валидации координат
    try:
        validate_coordinates(55.7558, 37.6173)
        print(f"✓ Валидация координат работает")
    except ValueError as e:
        print(f"✗ Ошибка валидации: {e}")
        return False
    
    return True


def run_all_tests():
    """Запуск всех тестов"""
    print("=" * 50)
    print("Тестирование функций модуля геймификации")
    print("=" * 50)
    
    tests = [
        ("UniquenessChecker", test_uniqueness_checker),
        ("RewardCalculator", test_reward_calculator),
        ("Utils", test_utils),
    ]
    
    results = []
    for name, test_func in tests:
        print(f"\n--- Тест: {name} ---")
        try:
            result = test_func()
            results.append((name, result))
            print(f"✓ {name}: PASSED")
        except Exception as e:
            print(f"✗ {name}: FAILED - {str(e)}")
            results.append((name, False))
    
    print("\n" + "=" * 50)
    print("Результаты:")
    print("=" * 50)
    for name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{name}: {status}")
    
    all_passed = all(result for _, result in results)
    return all_passed


if __name__ == "__main__":
    # Для запуска в Django shell:
    # python manage.py shell
    # >>> from gamification.test_functions import run_all_tests
    # >>> run_all_tests()
    run_all_tests()

