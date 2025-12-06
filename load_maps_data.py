#!/usr/bin/env python
"""
Скрипт для загрузки тестовых данных в модуль карт (maps)
Создает категории, POI и рейтинги для карты Москвы
"""

import os
import django
from django.utils import timezone
import random

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'health_map.settings')
django.setup()

from maps.models import POICategory, POI, POIRating

def load_maps_data():
    """Загружает тестовые данные для модуля карт"""
    
    print("=" * 60)
    print("Загрузка тестовых данных для модуля карт")
    print("=" * 60)
    
    # 1. Создаем категории POI
    print("\n1. Создание категорий POI...")
    categories_data = [
        {
            'name': 'Аптеки',
            'slug': 'apteki',
            'description': 'Аптеки и пункты продажи лекарств',
            'marker_color': '#00FF00',
            'health_weight': 1.5,
            'health_importance': 9,
            'display_order': 1
        },
        {
            'name': 'Медицинские учреждения',
            'slug': 'meditsina',
            'description': 'Больницы, поликлиники, клиники',
            'marker_color': '#FF0000',
            'health_weight': 2.0,
            'health_importance': 10,
            'display_order': 2
        },
        {
            'name': 'Спортивные объекты',
            'slug': 'sport',
            'description': 'Фитнес-клубы, спортзалы, бассейны',
            'marker_color': '#0000FF',
            'health_weight': 1.8,
            'health_importance': 8,
            'display_order': 3
        },
        {
            'name': 'Здоровое питание',
            'slug': 'zdorovoe-pitanie',
            'description': 'Кафе и рестораны здорового питания',
            'marker_color': '#FFFF00',
            'health_weight': 1.3,
            'health_importance': 7,
            'display_order': 4
        },
        {
            'name': 'Магазины здорового питания',
            'slug': 'magaziny',
            'description': 'Магазины органических и здоровых продуктов',
            'marker_color': '#00FFFF',
            'health_weight': 1.2,
            'health_importance': 6,
            'display_order': 5
        },
        {
            'name': 'Алкоголь и табак',
            'slug': 'alkogol-tabak',
            'description': 'Точки продажи алкоголя и табачных изделий',
            'marker_color': '#FF00FF',
            'health_weight': -1.5,
            'health_importance': 2,
            'display_order': 6
        },
    ]
    
    categories = {}
    for cat_data in categories_data:
        category, created = POICategory.objects.get_or_create(
            slug=cat_data['slug'],
            defaults=cat_data
        )
        categories[cat_data['slug']] = category
        status = "✓ Создана" if created else "→ Уже существует"
        print(f"   {status}: {category.name}")
    
    # 2. Создаем POI с координатами Москвы
    print("\n2. Создание точек интереса (POI) на карте Москвы...")
    
    moscow_pois = [
        # Аптеки
        {'name': 'Аптека №36', 'category': 'apteki', 'address': 'Красная площадь, 3', 
         'lat': 55.7547, 'lon': 37.6198, 'phone': '+7 (495) 123-45-67',
         'working_hours': 'Пн-Вс: 08:00-22:00'},
        {'name': 'Аптека "Ригла"', 'category': 'apteki', 'address': 'Тверская ул., 15', 
         'lat': 55.7576, 'lon': 37.6126, 'phone': '+7 (495) 234-56-78'},
        {'name': 'Аптека "Столица"', 'category': 'apteki', 'address': 'Арбат ул., 40', 
         'lat': 55.7520, 'lon': 37.5925, 'phone': '+7 (495) 345-67-89'},
        
        # Медицина
        {'name': 'Городская больница №1', 'category': 'meditsina', 
         'address': 'ул. Покровка, 22', 'lat': 55.7555, 'lon': 37.6422,
         'phone': '+7 (495) 456-78-90', 'website': 'https://example.com/hospital1'},
        {'name': 'Поликлиника №2', 'category': 'meditsina', 
         'address': 'ул. Большая Дмитровка, 25', 'lat': 55.7575, 'lon': 37.6160,
         'phone': '+7 (495) 567-89-01', 'working_hours': 'Пн-Пт: 08:00-20:00'},
        {'name': 'Клиника "Здоровье"', 'category': 'meditsina', 
         'address': 'Кузнецкий мост, 8', 'lat': 55.7608, 'lon': 37.6235,
         'phone': '+7 (495) 678-90-12', 'email': 'info@zdorovie.ru'},
        
        # Спорт
        {'name': 'Фитнес-клуб "World Class"', 'category': 'sport', 
         'address': 'Тверская ул., 26', 'lat': 55.7595, 'lon': 37.6095,
         'phone': '+7 (495) 789-01-23', 'website': 'https://worldclass.ru'},
        {'name': 'Спортзал "Фитнес-мастер"', 'category': 'sport', 
         'address': 'ул. Мясницкая, 20', 'lat': 55.7592, 'lon': 37.6325,
         'phone': '+7 (495) 890-12-34'},
        {'name': 'Бассейн "Олимпийский"', 'category': 'sport', 
         'address': 'Олимпийский пр-т, 16', 'lat': 55.7818, 'lon': 37.6219,
         'phone': '+7 (495) 901-23-45', 'working_hours': 'Пн-Вс: 07:00-23:00'},
        {'name': 'Спорткомплекс "Лужники"', 'category': 'sport', 
         'address': 'Лужнецкая наб., 24', 'lat': 55.7158, 'lon': 37.5547,
         'phone': '+7 (495) 212-34-56'},
        
        # Здоровое питание
        {'name': 'Кафе "Здоровое питание"', 'category': 'zdorovoe-pitanie', 
         'address': 'ул. Никольская, 10', 'lat': 55.7556, 'lon': 37.6236,
         'phone': '+7 (495) 123-45-67', 'working_hours': 'Пн-Вс: 10:00-22:00'},
        {'name': 'Ресторан "Veggie"', 'category': 'zdorovoe-pitanie', 
         'address': 'Кузнецкий мост, 12', 'lat': 55.7605, 'lon': 37.6220,
         'phone': '+7 (495) 234-56-78', 'website': 'https://veggie.ru'},
        {'name': 'Смузи-бар "Fresh"', 'category': 'zdorovoe-pitanie', 
         'address': 'ул. Петровка, 15', 'lat': 55.7640, 'lon': 37.6145,
         'phone': '+7 (495) 345-67-89'},
        
        # Магазины
        {'name': 'Магазин "ВкусВилл"', 'category': 'magaziny', 
         'address': 'ул. Тверская, 18', 'lat': 55.7580, 'lon': 37.6105,
         'phone': '+7 (495) 456-78-90', 'working_hours': 'Пн-Вс: 08:00-23:00'},
        {'name': 'Эко-маркет "Био"', 'category': 'magaziny', 
         'address': 'ул. Большая Никитская, 25', 'lat': 55.7550, 'lon': 37.5960,
         'phone': '+7 (495) 567-89-01'},
        {'name': 'Магазин "Азбука Вкуса"', 'category': 'magaziny', 
         'address': 'ул. Арбат, 45', 'lat': 55.7515, 'lon': 37.5930,
         'phone': '+7 (495) 678-90-12'},
        
        # Алкоголь и табак
        {'name': 'Магазин "Алко-Маркет"', 'category': 'alkogol-tabak', 
         'address': 'ул. Тверская, 20', 'lat': 55.7590, 'lon': 37.6110,
         'phone': '+7 (495) 789-01-23'},
        {'name': 'Табачная лавка', 'category': 'alkogol-tabak', 
         'address': 'ул. Петровка, 18', 'lat': 55.7635, 'lon': 37.6150,
         'phone': '+7 (495) 890-12-34'},
    ]
    
    pois_created = []
    for poi_data in moscow_pois:
        category = categories[poi_data['category']]
        poi, created = POI.objects.get_or_create(
            name=poi_data['name'],
            address=poi_data['address'],
            defaults={
                'category': category,
                'latitude': poi_data['lat'],
                'longitude': poi_data['lon'],
                'phone': poi_data.get('phone', ''),
                'website': poi_data.get('website', ''),
                'email': poi_data.get('email', ''),
                'working_hours': poi_data.get('working_hours', ''),
                'description': f"Тестовый объект: {poi_data['name']} в Москве",
                'is_geocoded': True,
                'geocoded_at': timezone.now(),
                'is_active': True
            }
        )
        pois_created.append(poi)
        status = "✓ Создан" if created else "→ Уже существует"
        print(f"   {status}: {poi.name} ({category.name})")
    
    # 3. Создаем рейтинги для POI
    print("\n3. Создание рейтингов для POI...")
    for poi in pois_created:
        rating, created = POIRating.objects.get_or_create(
            poi=poi,
            defaults={
                'health_score': round(random.uniform(30.0, 95.0), 1),
                'reviews_count': random.randint(0, 50),
                'approved_reviews_count': random.randint(0, 40),
                'average_user_rating': round(random.uniform(3.0, 5.0), 1),
                'calculation_method': 'weighted_average',
                'metrics': {
                    'accessibility': random.randint(1, 10),
                    'quality': random.randint(1, 10),
                    'popularity': random.randint(1, 10)
                }
            }
        )
        if not created:
            # Обновляем рейтинг если уже существует
            rating.health_score = round(random.uniform(30.0, 95.0), 1)
            rating.reviews_count = random.randint(0, 50)
            rating.approved_reviews_count = random.randint(0, 40)
            rating.save()
        status = "✓ Создан" if created else "✓ Обновлен"
        print(f"   {status} рейтинг: {poi.name} - {rating.health_score:.1f}/100")
    
    # Итоговая статистика
    print("\n" + "=" * 60)
    print("ИТОГОВАЯ СТАТИСТИКА:")
    print("=" * 60)
    print(f"✓ Категорий: {POICategory.objects.count()}")
    print(f"✓ Точек интереса (POI): {POI.objects.count()}")
    print(f"✓ Рейтингов: {POIRating.objects.count()}")
    print("=" * 60)
    print("\n✅ Тестовые данные для карты успешно загружены!")
    print("\n📍 Откройте админку, чтобы увидеть записи:")
    print("   http://localhost:8000/admin/maps/")

if __name__ == '__main__':
    load_maps_data()

