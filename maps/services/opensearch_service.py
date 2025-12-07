"""
Сервис для работы с OpenSearch для геопространственных запросов

Использует OpenSearch для точного и быстрого поиска POI по радиусу
"""

import logging
from typing import List, Dict, Optional
from django.conf import settings
from maps.models import POI

logger = logging.getLogger(__name__)

try:
    from opensearchpy import OpenSearch, RequestsHttpConnection
    OPENSEARCH_AVAILABLE = True
except ImportError:
    OPENSEARCH_AVAILABLE = False
    logger.warning('opensearch-py не установлен. Установите: pip install opensearch-py')


class OpenSearchService:
    """
    Сервис для работы с OpenSearch
    
    Предоставляет:
    - Индексацию POI с геокоординатами
    - Поиск POI в радиусе (точный геопространственный запрос)
    - Поиск POI в bounding box
    """
    
    INDEX_NAME = 'pois'
    
    def __init__(self):
        """
        Инициализация клиента OpenSearch
        """
        if not OPENSEARCH_AVAILABLE:
            self.client = None
            self.enabled = False
            return
        
        # Настройки подключения
        opensearch_host = getattr(settings, 'OPENSEARCH_HOST', 'localhost')
        opensearch_port = getattr(settings, 'OPENSEARCH_PORT', 9200)
        opensearch_use_ssl = getattr(settings, 'OPENSEARCH_USE_SSL', False)
        opensearch_verify_certs = getattr(settings, 'OPENSEARCH_VERIFY_CERTS', True)
        opensearch_auth = getattr(settings, 'OPENSEARCH_AUTH', None)  # ('username', 'password')
        
        try:
            http_auth = opensearch_auth if opensearch_auth else None
            
            self.client = OpenSearch(
                hosts=[{'host': opensearch_host, 'port': opensearch_port}],
                http_auth=http_auth,
                use_ssl=opensearch_use_ssl,
                verify_certs=opensearch_verify_certs,
                connection_class=RequestsHttpConnection,
                timeout=30,
            )
            
            # Проверяем подключение
            if self.client.ping():
                self.enabled = True
                self._ensure_index_exists()
            else:
                logger.error('Не удалось подключиться к OpenSearch')
                self.enabled = False
                
        except Exception as e:
            logger.error(f'Ошибка при инициализации OpenSearch: {str(e)}')
            self.client = None
            self.enabled = False
    
    def _ensure_index_exists(self):
        """
        Создать индекс если его нет
        """
        if not self.enabled or not self.client:
            return
        
        try:
            if not self.client.indices.exists(index=self.INDEX_NAME):
                # Создаем индекс с маппингом для геокоординат
                index_body = {
                    'settings': {
                        'number_of_shards': 1,
                        'number_of_replicas': 0,
                    },
                    'mappings': {
                        'properties': {
                            'uuid': {'type': 'keyword'},
                            'name': {'type': 'text', 'fields': {'keyword': {'type': 'keyword'}}},
                            'address': {'type': 'text'},
                            'latitude': {'type': 'float'},
                            'longitude': {'type': 'float'},
                            'location': {
                                'type': 'geo_point'  # Геопространственный тип для точных запросов
                            },
                            'category_slug': {'type': 'keyword'},
                            'category_name': {'type': 'text'},
                            'health_score': {'type': 'float'},
                            'is_active': {'type': 'boolean'},
                            'moderation_status': {'type': 'keyword'},  # Добавляем поле статуса модерации
                            'created_at': {'type': 'date'},
                        }
                    }
                }
                
                # Используем body для старых версий, или напрямую передаем для новых
                try:
                    self.client.indices.create(index=self.INDEX_NAME, body=index_body)
                except TypeError:
                    # Для новых версий opensearch-py
                    self.client.indices.create(index=self.INDEX_NAME, **index_body)
                logger.info(f'Индекс {self.INDEX_NAME} создан')
        except Exception as e:
            logger.error(f'Ошибка при создании индекса: {str(e)}')
    
    def index_poi(self, poi: POI) -> bool:
        """
        Индексировать POI в OpenSearch
        
        Args:
            poi: Объект POI
        
        Returns:
            bool: True если успешно
        """
        if not self.enabled or not self.client:
            return False
        
        try:
            document = {
                'uuid': str(poi.uuid),
                'name': poi.name,
                'address': poi.address,
                'latitude': float(poi.latitude),
                'longitude': float(poi.longitude),
                'location': {
                    'lat': float(poi.latitude),
                    'lon': float(poi.longitude)
                },
                'category_slug': getattr(poi.category, 'slug', '') if poi.category else '',
                'category_name': poi.category.name if poi.category else '',
                'health_score': float(poi.rating.health_score) if poi.rating else 50.0,
                'is_active': poi.is_active,
                'moderation_status': poi.moderation_status,  # Добавляем статус модерации
                'created_at': poi.created_at.isoformat() if poi.created_at else None,
            }
            
            # Используем body для старых версий, или document для новых
            try:
                self.client.index(
                    index=self.INDEX_NAME,
                    id=str(poi.uuid),
                    body=document,
                    refresh=True
                )
            except TypeError:
                # Для новых версий opensearch-py
                self.client.index(
                    index=self.INDEX_NAME,
                    id=str(poi.uuid),
                    document=document,
                    refresh=True
                )
            
            return True
        except Exception as e:
            logger.error(f'Ошибка при индексации POI {poi.uuid}: {str(e)}')
            return False
    
    def delete_poi(self, poi_uuid: str) -> bool:
        """
        Удалить POI из индекса
        
        Args:
            poi_uuid: UUID POI
        
        Returns:
            bool: True если успешно
        """
        if not self.enabled or not self.client:
            return False
        
        try:
            self.client.delete(
                index=self.INDEX_NAME,
                id=str(poi_uuid),
                refresh=True
            )
            return True
        except Exception as e:
            # Игнорируем ошибку если документ не найден
            if 'not_found' not in str(e).lower():
                logger.error(f'Ошибка при удалении POI {poi_uuid}: {str(e)}')
            return False
    
    def search_in_radius(self, center_lat: float, center_lon: float, 
                        radius_meters: float, category_filters: Optional[List[str]] = None) -> List[Dict]:
        """
        Поиск POI в радиусе (точный геопространственный запрос)
        
        Args:
            center_lat: Широта центра
            center_lon: Долгота центра
            radius_meters: Радиус в метрах
            category_filters: Список slug категорий для фильтрации
        
        Returns:
            List[Dict]: Список POI с расстояниями
        """
        if not self.enabled or not self.client:
            # Fallback на Django ORM если OpenSearch недоступен
            return self._fallback_search_in_radius(center_lat, center_lon, radius_meters, category_filters)
        
        try:
            # Формируем запрос
            # Используем should для фильтра по статусу модерации (поддержка старых документов без этого поля)
            query = {
                'bool': {
                    'must': [
                        {
                            'geo_distance': {
                                'distance': f'{radius_meters}m',
                                'location': {
                                    'lat': float(center_lat),
                                    'lon': float(center_lon)
                                }
                            }
                        },
                        {
                            'term': {
                                'is_active': True
                            }
                        }
                    ],
                    'should': [
                        {
                            'term': {
                                'moderation_status': 'approved'
                            }
                        },
                        {
                            'bool': {
                                'must_not': {
                                    'exists': {
                                        'field': 'moderation_status'
                                    }
                                }
                            }
                        }
                    ],
                    'minimum_should_match': 1
                }
            }
            
            # Добавляем фильтр по категориям если указаны
            if category_filters:
                query['bool']['must'].append({
                    'terms': {
                        'category_slug': category_filters
                    }
                })
            
            # Выполняем запрос
            search_body = {
                'query': query,
                'size': 1000,  # Максимум результатов
                'sort': [
                    {
                        '_geo_distance': {
                            'location': {
                                'lat': float(center_lat),
                                'lon': float(center_lon)
                            },
                            'order': 'asc',
                            'unit': 'm'
                        }
                    }
                ]
            }
            
            try:
                response = self.client.search(index=self.INDEX_NAME, body=search_body)
            except TypeError:
                # Для новых версий opensearch-py
                response = self.client.search(index=self.INDEX_NAME, **search_body)
            
            # Формируем результат
            results = []
            hits_total = response['hits']['total']
            total_count = hits_total['value'] if isinstance(hits_total, dict) else hits_total
            
            logger.info(f'OpenSearch нашел {total_count} результатов, обрабатываем {len(response["hits"]["hits"])} документов')
            
            for hit in response['hits']['hits']:
                source = hit['_source']
                distance = hit.get('sort', [None])[0]  # Расстояние из сортировки
                
                # Проверяем статус модерации (если поле есть в документе)
                moderation_status = source.get('moderation_status', 'approved')
                if moderation_status != 'approved':
                    logger.debug(f'Пропускаем POI {source["uuid"]} со статусом {moderation_status}')
                    continue
                
                results.append({
                    'uuid': source['uuid'],
                    'name': source['name'],
                    'address': source['address'],
                    'latitude': source['latitude'],
                    'longitude': source['longitude'],
                    'category_slug': source.get('category_slug', ''),
                    'category_name': source.get('category_name', ''),
                    'health_score': source.get('health_score', 50.0),
                    'distance_meters': distance if distance is not None else 0.0,
                })
            
            logger.info(f'OpenSearch вернул {len(results)} одобренных POI после фильтрации')
            return results
            
        except Exception as e:
            logger.error(f'Ошибка при поиске в радиусе через OpenSearch: {str(e)}', exc_info=True)
            logger.info('Используем fallback на Django ORM')
            # Fallback на Django ORM
            return self._fallback_search_in_radius(center_lat, center_lon, radius_meters, category_filters)
    
    def search_in_bbox(self, sw_lat: float, sw_lon: float, 
                      ne_lat: float, ne_lon: float,
                      category_filters: Optional[List[str]] = None) -> List[Dict]:
        """
        Поиск POI в bounding box
        
        Args:
            sw_lat: Широта юго-западного угла
            sw_lon: Долгота юго-западного угла
            ne_lat: Широта северо-восточного угла
            ne_lon: Долгота северо-восточного угла
            category_filters: Список slug категорий для фильтрации
        
        Returns:
            List[Dict]: Список POI
        """
        if not self.enabled or not self.client:
            # Fallback на Django ORM
            return self._fallback_search_in_bbox(sw_lat, sw_lon, ne_lat, ne_lon, category_filters)
        
        try:
            query = {
                'bool': {
                    'must': [
                        {
                            'geo_bounding_box': {
                                'location': {
                                    'top_left': {
                                        'lat': float(ne_lat),
                                        'lon': float(sw_lon)
                                    },
                                    'bottom_right': {
                                        'lat': float(sw_lat),
                                        'lon': float(ne_lon)
                                    }
                                }
                            }
                        },
                        {
                            'term': {
                                'is_active': True
                            }
                        }
                    ]
                }
            }
            
            if category_filters:
                query['bool']['must'].append({
                    'terms': {
                        'category_slug': category_filters
                    }
                })
            
            search_body = {
                'query': query,
                'size': 1000
            }
            
            try:
                response = self.client.search(index=self.INDEX_NAME, body=search_body)
            except TypeError:
                # Для новых версий opensearch-py
                response = self.client.search(index=self.INDEX_NAME, **search_body)
            
            results = []
            for hit in response['hits']['hits']:
                source = hit['_source']
                results.append({
                    'uuid': source['uuid'],
                    'name': source['name'],
                    'address': source['address'],
                    'latitude': source['latitude'],
                    'longitude': source['longitude'],
                    'category_slug': source.get('category_slug', ''),
                    'category_name': source.get('category_name', ''),
                    'health_score': source.get('health_score', 50.0),
                })
            
            return results
            
        except Exception as e:
            logger.error(f'Ошибка при поиске в bbox: {str(e)}')
            return self._fallback_search_in_bbox(sw_lat, sw_lon, ne_lat, ne_lon, category_filters)
    
    def _fallback_search_in_radius(self, center_lat: float, center_lon: float,
                                   radius_meters: float, category_filters: Optional[List[str]] = None) -> List[Dict]:
        """
        Fallback на Django ORM если OpenSearch недоступен
        """
        from geopy.distance import geodesic
        
        # Приблизительный фильтр
        approx_radius_deg = (radius_meters * 1.414) / 111000.0
        pois = POI.objects.filter(
            is_active=True,
            latitude__gte=float(center_lat) - approx_radius_deg,
            latitude__lte=float(center_lat) + approx_radius_deg,
            longitude__gte=float(center_lon) - approx_radius_deg,
            longitude__lte=float(center_lon) + approx_radius_deg,
        ).select_related('category', 'rating')
        
        if category_filters:
            pois = pois.filter(category__slug__in=category_filters)
        
        results = []
        center_point = (float(center_lat), float(center_lon))
        
        for poi in pois:
            try:
                poi_point = (float(poi.latitude), float(poi.longitude))
                distance = geodesic(center_point, poi_point).meters
                if distance <= float(radius_meters):
                    results.append({
                        'uuid': str(poi.uuid),
                        'name': poi.name,
                        'address': poi.address,
                        'latitude': float(poi.latitude),
                        'longitude': float(poi.longitude),
                        'category_slug': poi.category.slug if poi.category else '',
                        'category_name': poi.category.name if poi.category else '',
                        'health_score': float(poi.rating.health_score) if poi.rating else 50.0,
                        'distance_meters': distance,
                    })
            except (ValueError, TypeError):
                continue
        
        return results
    
    def _fallback_search_in_bbox(self, sw_lat: float, sw_lon: float,
                                 ne_lat: float, ne_lon: float,
                                 category_filters: Optional[List[str]] = None) -> List[Dict]:
        """
        Fallback на Django ORM для bbox
        """
        pois = POI.objects.filter(
            is_active=True,
            latitude__gte=float(sw_lat),
            latitude__lte=float(ne_lat),
            longitude__gte=float(sw_lon),
            longitude__lte=float(ne_lon)
        ).select_related('category', 'rating')
        
        if category_filters:
            pois = pois.filter(category__slug__in=category_filters)
        
        results = []
        for poi in pois:
            results.append({
                'uuid': str(poi.uuid),
                'name': poi.name,
                'address': poi.address,
                'latitude': float(poi.latitude),
                'longitude': float(poi.longitude),
                'category_slug': poi.category.slug if poi.category else '',
                'category_name': poi.category.name if poi.category else '',
                'health_score': float(poi.rating.health_score) if poi.rating else 50.0,
            })
        
        return results
    
    def reindex_all(self) -> int:
        """
        Переиндексировать все POI
        
        Returns:
            int: Количество проиндексированных POI
        """
        if not self.enabled:
            logger.warning('OpenSearch недоступен, переиндексация невозможна')
            return 0
        
        count = 0
        # Индексируем только активные и одобренные места
        pois = POI.objects.filter(
            is_active=True, 
            moderation_status='approved'
        ).select_related('category', 'rating')
        
        for poi in pois:
            if self.index_poi(poi):
                count += 1
        
        logger.info(f'Переиндексировано {count} POI')
        return count

