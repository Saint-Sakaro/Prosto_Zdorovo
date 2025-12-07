"""
Базовый сервис для работы с GIGACHAT LLM

Используется для:
- Генерации анкет для новых категорий
- Анализа отзывов и извлечения фактов
- Сентимент-анализа отзывов

Использует GIGACHAT API от Сбера.
"""

from django.conf import settings
import json
import logging
import requests
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


class LLMService:
    """
    Класс для работы с GIGACHAT API
    
    Методы:
    - generate_schema(): Генерация схемы анкеты для категории
    - analyze_review(): Анализ отзыва и извлечение фактов
    - check_sentiment(): Проверка соответствия сентимента и оценки
    """
    
    def __init__(self):
        """
        Инициализация GIGACHAT сервиса
        
        Настройки из settings:
        - GIGACHAT_CLIENT_ID: Client ID для авторизации
        - GIGACHAT_CLIENT_SECRET: Client Secret для авторизации
        - GIGACHAT_SCOPE: Scope для доступа (по умолчанию GIGACHAT_API_PERS)
        - GIGACHAT_MODEL: Модель для использования (по умолчанию GigaChat)
        """
        self.client_id = getattr(settings, 'GIGACHAT_CLIENT_ID', None)
        self.client_secret = getattr(settings, 'GIGACHAT_CLIENT_SECRET', None)
        self.scope = getattr(settings, 'GIGACHAT_SCOPE', 'GIGACHAT_API_PERS')
        self.model = getattr(settings, 'GIGACHAT_MODEL', 'GigaChat')
        self.api_url = 'https://gigachat.devices.sberbank.ru/api/v1'
        
        self._access_token = None
        self._token_expires_at = None
        
        if not self.client_id or not self.client_secret:
            logger.warning('GIGACHAT credentials not configured. LLM features will be disabled.')
    
    def _get_access_token(self) -> Optional[str]:
        """
        Получает access token для GIGACHAT API
        
        Returns:
            str: Access token или None при ошибке
        """
        # Если токен уже получен и не истек, возвращаем его
        from django.utils import timezone
        if self._access_token and self._token_expires_at:
            if timezone.now() < self._token_expires_at:
                return self._access_token
            else:
                # Токен истек, сбрасываем
                self._access_token = None
                self._token_expires_at = None
        
        if not self.client_id or not self.client_secret:
            return None
        
        try:
            # Авторизация через OAuth 2.0 для GIGACHAT
            # Документация: https://developers.sber.ru/docs/ru/gigachat/api/authorization
            auth_url = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth'
            auth_data = {
                'scope': self.scope
            }
            auth_response = requests.post(
                auth_url,
                data=auth_data,
                auth=(self.client_id, self.client_secret),
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                verify=True,  # GIGACHAT требует SSL сертификат
                timeout=10
            )
            
            if auth_response.status_code == 200:
                token_data = auth_response.json()
                self._access_token = token_data.get('access_token')
                
                # Сохраняем время истечения токена
                expires_in = token_data.get('expires_in', 1800)  # По умолчанию 30 минут
                from django.utils import timezone
                from datetime import timedelta
                self._token_expires_at = timezone.now() + timedelta(seconds=expires_in - 60)  # -60 сек запас
                
                return self._access_token
            else:
                logger.error(f'GIGACHAT auth error: {auth_response.status_code} - {auth_response.text}')
                return None
        except Exception as e:
            logger.error(f'GIGACHAT auth exception: {str(e)}')
            return None
    
    def _call_gigachat(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        """
        Вызывает GIGACHAT API для генерации ответа
        
        Args:
            prompt: Пользовательский промпт
            system_prompt: Системный промпт (опционально)
        
        Returns:
            str: Ответ от модели или None при ошибке
        """
        token = self._get_access_token()
        if not token:
            logger.error('Cannot get GIGACHAT access token')
            return None
        
        try:
            chat_url = f'{self.api_url}/chat/completions'
            
            messages = []
            if system_prompt:
                messages.append({'role': 'system', 'content': system_prompt})
            messages.append({'role': 'user', 'content': prompt})
            
            payload = {
                'model': self.model,
                'messages': messages,
                'temperature': 0.7,
                'max_tokens': 2000
            }
            
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(chat_url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                # Извлекаем текст ответа
                if 'choices' in result and len(result['choices']) > 0:
                    return result['choices'][0]['message']['content']
                else:
                    logger.error(f'Unexpected GIGACHAT response format: {result}')
                    return None
            else:
                logger.error(f'GIGACHAT API error: {response.status_code} - {response.text}')
                return None
        except Exception as e:
            logger.error(f'GIGACHAT API exception: {str(e)}')
            return None
    
    def generate_schema(self, category_name, category_description=""):
        """
        Генерирует JSON-схему анкеты для категории через LLM
        
        Args:
            category_name: Название категории
            category_description: Описание категории (опционально)
        
        Returns:
            dict: JSON-схема анкеты с полями
        """
        prompt = f"""
        Создай JSON-схему анкеты для оценки объекта типа "{category_name}".
        {f"Описание: {category_description}" if category_description else ""}
        
        Анкета должна содержать поля для оценки влияния объекта на здоровье жителей.
        Поддерживаемые типы полей: boolean, range, select, photo.
        
        Верни JSON в следующем формате:
        {{
          "fields": [
            {{
              "id": "уникальный_идентификатор",
              "type": "boolean|range|select|photo",
              "label": "Название поля",
              "description": "Описание поля",
              "direction": 1 (полезный) или -1 (вредный),
              "weight": число (важность поля),
              "scale_min": число (для range),
              "scale_max": число (для range),
              "options": ["вариант1", "вариант2"] (для select),
              "mapping": {{"вариант1": 1.0, "вариант2": 0.5}} (для select)
            }}
          ],
          "version": "1.0"
        }}
        """
        
        # Системный промпт для генерации схемы
        system_prompt = """Ты эксперт по созданию анкет для оценки объектов городской инфраструктуры.
        Твоя задача - создать JSON-схему анкеты с полями для оценки влияния объекта на здоровье жителей.
        Всегда возвращай валидный JSON без дополнительных комментариев."""
        
        # Вызываем GIGACHAT
        response_text = self._call_gigachat(prompt, system_prompt)
        
        if not response_text:
            logger.error('Failed to generate schema via GIGACHAT')
            return {
                "fields": [],
                "version": "1.0"
            }
        
        # Парсим JSON из ответа (может быть обернут в markdown код-блоки)
        try:
            # Убираем markdown код-блоки если есть
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            schema = json.loads(response_text)
            
            # Валидация структуры
            if 'fields' not in schema:
                schema['fields'] = []
            if 'version' not in schema:
                schema['version'] = '1.0'
            
            return schema
        except json.JSONDecodeError as e:
            logger.error(f'Failed to parse GIGACHAT response as JSON: {str(e)}')
            logger.debug(f'Response text: {response_text}')
            return {
                "fields": [],
                "version": "1.0"
            }
    
    def analyze_review(self, review_text, poi_category=None):
        """
        Анализирует текст отзыва и извлекает факты
        
        Args:
            review_text: Текст отзыва
            poi_category: Категория объекта (для контекста)
        
        Returns:
            dict: {
                'extracted_facts': [
                    {
                        'field_id': 'field_id',
                        'old_value': 'старое значение',
                        'new_value': 'новое значение',
                        'confidence': float
                    }
                ],
                'sentiment': float (-1 до 1),
                'suggestions': [список предложений по обновлению анкеты]
            }
        """
        prompt = f"""
        Проанализируй следующий отзыв и извлеки факты об объекте:
        
        "{review_text}"
        
        {f"Категория объекта: {poi_category}" if poi_category else ""}
        
        Найди упоминания о:
        - Изменениях характеристик объекта (установка, поломка, добавление)
        - Состоянии объекта (хорошее, плохое, среднее)
        - Наличии или отсутствии элементов инфраструктуры
        
        Верни JSON в формате:
        {{
          "extracted_facts": [
            {{
              "field_id": "идентификатор_поля_анкеты",
              "old_value": "предыдущее значение",
              "new_value": "новое значение",
              "confidence": 0.0-1.0
            }}
          ],
          "sentiment": -1.0 до 1.0,
          "suggestions": ["предложение 1", "предложение 2"]
        }}
        """
        
        # Системный промпт для анализа отзывов
        system_prompt = """Ты эксперт по анализу отзывов о городских объектах.
        Твоя задача - извлечь факты об изменениях объекта и определить сентимент.
        Всегда возвращай валидный JSON без дополнительных комментариев."""
        
        # Вызываем GIGACHAT
        response_text = self._call_gigachat(prompt, system_prompt)
        
        if not response_text:
            logger.error('Failed to analyze review via GIGACHAT')
            return {
                'extracted_facts': [],
                'sentiment': 0.0,
                'suggestions': []
            }
        
        # Парсим JSON из ответа
        try:
            # Убираем markdown код-блоки если есть
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            analysis = json.loads(response_text)
            
            # Валидация структуры
            if 'extracted_facts' not in analysis:
                analysis['extracted_facts'] = []
            if 'sentiment' not in analysis:
                analysis['sentiment'] = 0.0
            if 'suggestions' not in analysis:
                analysis['suggestions'] = []
            
            return analysis
        except json.JSONDecodeError as e:
            logger.error(f'Failed to parse GIGACHAT response as JSON: {str(e)}')
            logger.debug(f'Response text: {response_text}')
            return {
                'extracted_facts': [],
                'sentiment': 0.0,
                'suggestions': []
            }
    
    def check_sentiment_consistency(self, review_text, rating):
        """
        Проверяет соответствие сентимента текста и оценки
        
        Args:
            review_text: Текст отзыва
            rating: Оценка отзыва (1-5)
        
        Returns:
            dict: {
                'is_consistent': bool,
                'sentiment_score': float,
                'expected_rating': int,
                'warning': str (если несоответствие)
            }
        """
        # Промпт для проверки сентимента
        prompt = f"""
        Проанализируй сентимент следующего отзыва и определи, соответствует ли он оценке {rating} (1-5):
        
        "{review_text}"
        
        Верни JSON в формате:
        {{
          "sentiment_score": -1.0 до 1.0 (отрицательный до положительного),
          "expected_rating": 1-5 (ожидаемая оценка на основе текста),
          "is_consistent": true/false (соответствует ли оценка сентименту)
        }}
        """
        
        system_prompt = """Ты эксперт по анализу сентимента текстов.
        Твоя задача - определить эмоциональную окраску текста и соответствие оценки.
        Всегда возвращай валидный JSON без дополнительных комментариев."""
        
        # Вызываем GIGACHAT
        response_text = self._call_gigachat(prompt, system_prompt)
        
        if not response_text:
            logger.error('Failed to check sentiment via GIGACHAT')
            return {
                'is_consistent': True,
                'sentiment_score': 0.0,
                'expected_rating': rating,
                'warning': None
            }
        
        # Парсим JSON из ответа
        try:
            # Убираем markdown код-блоки если есть
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            result = json.loads(response_text)
            
            # Преобразуем expected_rating в int и ограничиваем диапазон
            expected_rating = int(result.get('expected_rating', rating))
            expected_rating = max(1, min(5, expected_rating))
            
            # Проверяем соответствие (допускаем разницу в 1 балл)
            is_consistent = abs(expected_rating - rating) <= 1
            
            warning = None
            if not is_consistent:
                warning = f'Сентимент текста соответствует оценке {expected_rating}, но указана оценка {rating}'
            
            return {
                'is_consistent': is_consistent,
                'sentiment_score': float(result.get('sentiment_score', 0.0)),
                'expected_rating': expected_rating,
                'warning': warning
            }
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f'Failed to parse GIGACHAT response: {str(e)}')
            return {
                'is_consistent': True,
                'sentiment_score': 0.0,
                'expected_rating': rating,
                'warning': None
            }

