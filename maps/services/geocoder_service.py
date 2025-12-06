"""
Сервис геокодирования адресов через Яндекс Geocoder API

Реализует:
- Прямое геокодирование (адрес -> координаты)
- Обратное геокодирование (координаты -> адрес)
"""

import requests
from django.conf import settings
from django.utils import timezone
from maps.models import POI
import logging

logger = logging.getLogger(__name__)


class GeocoderService:
    """
    Класс для работы с Яндекс Geocoder API
    
    Методы:
    - geocode_address(): Прямое геокодирование (адрес -> координаты)
    - reverse_geocode(): Обратное геокодирование (координаты -> адрес)
    - geocode_poi(): Геокодирование POI объекта
    """
    
    def __init__(self):
        """
        Инициализация с API ключом из настроек
        """
        self.api_key = getattr(settings, 'YANDEX_GEOCODER_API_KEY', None)
        self.base_url = 'https://geocode-maps.yandex.ru/1.x/'
        
        if not self.api_key:
            logger.warning('YANDEX_GEOCODER_API_KEY не настроен. Геокодирование будет недоступно.')
    
    def geocode_address(self, address):
        """
        Прямое геокодирование: преобразование адреса в координаты
        
        Args:
            address: Адрес для геокодирования (строка)
        
        Returns:
            dict: {
                'latitude': float,
                'longitude': float,
                'formatted_address': str,  # Отформатированный адрес от Яндекса
                'country': str,
                'city': str,
                'street': str,
                'house': str,
            } или None в случае ошибки
        """
        if not self.api_key:
            logger.error('API ключ не настроен')
            return None
        
        try:
            params = {
                'apikey': self.api_key,
                'geocode': address,
                'format': 'json',
                'results': 1,
            }
            
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Парсим ответ Яндекс Geocoder API
            if 'response' in data and 'GeoObjectCollection' in data['response']:
                feature_members = data['response']['GeoObjectCollection'].get('featureMember', [])
                
                if not feature_members:
                    logger.warning(f'Адрес не найден: {address}')
                    return None
                
                geo_object = feature_members[0]['GeoObject']
                point = geo_object['Point']['pos']
                longitude, latitude = map(float, point.split())
                
                # Извлекаем компоненты адреса
                meta_data = geo_object.get('metaDataProperty', {}).get('GeocoderMetaData', {})
                formatted_address = meta_data.get('text', address)
                address_components = meta_data.get('Address', {}).get('Components', [])
                
                # Парсим компоненты адреса
                address_dict = {
                    'latitude': latitude,
                    'longitude': longitude,
                    'formatted_address': formatted_address,
                    'country': '',
                    'city': '',
                    'street': '',
                    'house': '',
                }
                
                for component in address_components:
                    kind = component.get('kind', '')
                    name = component.get('name', '')
                    
                    if kind == 'country':
                        address_dict['country'] = name
                    elif kind == 'locality' or kind == 'city':
                        address_dict['city'] = name
                    elif kind == 'street':
                        address_dict['street'] = name
                    elif kind == 'house':
                        address_dict['house'] = name
                
                return address_dict
            else:
                logger.error(f'Неожиданный формат ответа от API: {data}')
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f'Ошибка при запросе к Geocoder API: {str(e)}')
            return None
        except (KeyError, ValueError, IndexError) as e:
            logger.error(f'Ошибка при парсинге ответа API: {str(e)}')
            return None
    
    def reverse_geocode(self, latitude, longitude):
        """
        Обратное геокодирование: преобразование координат в адрес
        
        Args:
            latitude: Широта
            longitude: Долгота
        
        Returns:
            dict: {
                'formatted_address': str,  # Полный адрес
                'country': str,
                'city': str,
                'district': str,  # Район
                'street': str,
                'house': str,
                'short_name': str,  # Краткое название (город, улица и т.д.)
            } или None в случае ошибки
        """
        if not self.api_key:
            logger.error('API ключ не настроен')
            return None
        
        try:
            # Формат для Яндекс API: долгота, широта
            geocode_string = f"{longitude},{latitude}"
            
            params = {
                'apikey': self.api_key,
                'geocode': geocode_string,
                'format': 'json',
                'kind': 'house',  # Тип объекта
                'results': 1,
            }
            
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Парсим ответ
            if 'response' in data and 'GeoObjectCollection' in data['response']:
                feature_members = data['response']['GeoObjectCollection'].get('featureMember', [])
                
                if not feature_members:
                    logger.warning(f'Адрес не найден для координат: {latitude}, {longitude}')
                    return None
                
                geo_object = feature_members[0]['GeoObject']
                meta_data = geo_object.get('metaDataProperty', {}).get('GeocoderMetaData', {})
                formatted_address = meta_data.get('text', '')
                address_components = meta_data.get('Address', {}).get('Components', [])
                
                # Парсим компоненты адреса
                address_dict = {
                    'formatted_address': formatted_address,
                    'country': '',
                    'city': '',
                    'district': '',
                    'street': '',
                    'house': '',
                    'short_name': '',
                }
                
                city_name = ''
                street_name = ''
                
                for component in address_components:
                    kind = component.get('kind', '')
                    name = component.get('name', '')
                    
                    if kind == 'country':
                        address_dict['country'] = name
                    elif kind == 'locality' or kind == 'city':
                        address_dict['city'] = name
                        city_name = name
                    elif kind == 'district':
                        address_dict['district'] = name
                    elif kind == 'street':
                        address_dict['street'] = name
                        street_name = name
                    elif kind == 'house':
                        address_dict['house'] = name
                
                # Формируем краткое название
                if street_name:
                    address_dict['short_name'] = f"{city_name}, {street_name}" if city_name else street_name
                elif city_name:
                    address_dict['short_name'] = city_name
                else:
                    address_dict['short_name'] = formatted_address
                
                return address_dict
            else:
                logger.error(f'Неожиданный формат ответа от API: {data}')
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f'Ошибка при запросе к Geocoder API: {str(e)}')
            return None
        except (KeyError, ValueError, IndexError) as e:
            logger.error(f'Ошибка при парсинге ответа API: {str(e)}')
            return None
    
    def geocode_poi(self, poi):
        """
        Геокодирование POI объекта
        
        Args:
            poi: Объект POI
        
        Returns:
            bool: True если геокодирование успешно
        """
        if not self.api_key:
            logger.warning(f'API ключ не настроен. POI {poi.name} не будет геокодирован.')
            return False
        
        if poi.is_geocoded:
            logger.debug(f'POI {poi.name} уже геокодирован')
            return True
        
        result = self.geocode_address(poi.address)
        
        if result:
            poi.latitude = result['latitude']
            poi.longitude = result['longitude']
            poi.is_geocoded = True
            poi.geocoded_at = timezone.now()
            
            # Сохраняем отформатированный адрес в метаданные
            if 'formatted_address' in result:
                poi.metadata['formatted_address'] = result['formatted_address']
            
            poi.save()
            logger.info(f'POI {poi.name} успешно геокодирован')
            return True
        else:
            logger.warning(f'Не удалось геокодировать POI {poi.name}')
            return False
    
    def get_area_name(self, latitude, longitude, analysis_type='city'):
        """
        Получить название области для анализа
        
        Args:
            latitude: Широта центра области
            longitude: Долгота центра области
            analysis_type: Тип анализа ('city', 'street', 'radius')
        
        Returns:
            str: Название области (город, улица и т.д.)
        """
        if not self.api_key:
            return ''
        
        result = self.reverse_geocode(latitude, longitude)
        
        if not result:
            return ''
        
        if analysis_type == 'street':
            # Для улицы возвращаем название улицы
            if result.get('street'):
                return f"Улица: {result['street']}"
            elif result.get('short_name'):
                return result['short_name']
        elif analysis_type == 'city':
            # Для города возвращаем название города
            if result.get('city'):
                return result['city']
            elif result.get('district'):
                return result['district']
            elif result.get('short_name'):
                return result['short_name']
        else:  # radius
            # Для радиуса возвращаем краткое название
            return result.get('short_name', result.get('formatted_address', ''))
        
        return result.get('formatted_address', '')

