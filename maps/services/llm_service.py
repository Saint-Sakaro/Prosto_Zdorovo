"""
Базовый сервис для работы с GIGACHAT LLM

Используется для:
- Генерации анкет для новых категорий
- Анализа отзывов и извлечения фактов
- Сентимент-анализа отзывов

Использует официальную библиотеку GigaChat от Сбера.
"""

from django.conf import settings
import json
import logging
from typing import Optional, Dict, List

# Пытаемся импортировать официальную библиотеку GigaChat
try:
    from gigachat import GigaChat
    from gigachat.models.chat import Chat
    from gigachat.models.messages import Messages
    GIGACHAT_AVAILABLE = True
except ImportError:
    GIGACHAT_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Библиотека gigachat не установлена. Установите: pip install gigachat")

if GIGACHAT_AVAILABLE:
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
        
        Использует официальную библиотеку gigachat для работы с API.
        
        Настройки из settings:
        - GIGACHAT_API_KEY: Ключ авторизации (готовый Base64 ключ из личного кабинета)
        - GIGACHAT_CLIENT_ID: Client ID (если используется вместо API_KEY)
        - GIGACHAT_CLIENT_SECRET: Client Secret (если используется вместо API_KEY)
        - GIGACHAT_MODEL: Модель для использования (по умолчанию GigaChat)
        - GIGACHAT_VERIFY_SSL: Проверка SSL сертификатов (по умолчанию True)
        """
        if not GIGACHAT_AVAILABLE:
            logger.error('Библиотека gigachat не установлена. Установите: pip install gigachat')
            self.giga_client = None
            self.credentials = None
            return
        
        # Ключ GigaChat напрямую в коде (как запрошено пользователем)
        # Игнорируем env переменные, используем только этот ключ
        credentials = "MDE5YTg2Y2ItNTg0YS03YmJkLTg1MjctZDZmNGI0MDBiZmU3OmZjYTMyZTIwLTJiZGItNDlhMy04Y2E2LTI5ZDRjOWViNmNkNQ=="
        
        # Получаем модель из settings (по умолчанию None - библиотека использует модель по умолчанию)
        # В рабочем тесте model не указывается, поэтому не передаем его в конструктор
        model_from_settings = getattr(settings, 'GIGACHAT_MODEL', None)
        # Используем model только если он явно указан и не равен "GigaChat" (по умолчанию)
        # В рабочем тесте model не указывается, поэтому библиотека использует модель по умолчанию
        self.model = None  # Не указываем model - библиотека использует модель по умолчанию
        self.scope = getattr(settings, 'GIGACHAT_SCOPE', 'GIGACHAT_API_PERS')
        self.verify_ssl = getattr(settings, 'GIGACHAT_VERIFY_SSL', False)
        
        # Очищаем credentials от пробелов и переносов строк
        import re
        credentials_clean = re.sub(r'\s+', '', str(credentials).strip())
        self.credentials = credentials_clean
        logger.info('✅ GigaChat credentials настроены')
        logger.info(f'📏 Длина ключа: {len(self.credentials)} символов')
        
        # Сохраняем credentials и scope для использования при вызовах
        # Не инициализируем клиент сразу, чтобы избежать проблем с event loop
        self.giga_client = None  # Будет создаваться при первом использовании
    
    # Метод _get_access_token больше не нужен - библиотека GigaChat сама управляет токенами
    
    def _call_gigachat(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        """
        Вызывает GIGACHAT API для генерации ответа через официальную библиотеку
        
        Использует синхронный вызов через async_to_sync для работы в Django.
        
        Args:
            prompt: Пользовательский промпт
            system_prompt: Системный промпт (опционально)
        
        Returns:
            str: Ответ от модели или None при ошибке
        """
        if not GIGACHAT_AVAILABLE:
            logger.error('Библиотека gigachat не установлена')
            return None
        
        if not self.credentials:
            logger.error('Учетные данные GigaChat не настроены')
            return None
        
        try:
            logger.debug(f'🔑 Используется ключ длиной {len(self.credentials)} символов для авторизации')
            logger.debug(f'📋 Scope: {self.scope}')
            
            # Используем формат с параметрами через словарь (стандартный формат API)
            # Это более надежный подход, который работает в любом окружении
            messages = []
            
            # Если есть system_prompt, добавляем его как системное сообщение
            if system_prompt:
                messages.append({
                    "role": "system",
                    "content": system_prompt
                })
            
            # Добавляем пользовательский промпт
            messages.append({
                "role": "user",
                "content": prompt
            })
            
            # Формируем параметры для chat метода
            chat_params = {
                "messages": messages
            }
            
            # Используем синхронный вызов напрямую - библиотека сама обрабатывает async внутри
            # Исправляем проблему с event loop в потоках Django
            import asyncio
            import threading
            
            # Проверяем, есть ли event loop в текущем потоке
            try:
                loop = asyncio.get_event_loop()
                if loop.is_closed():
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
            except RuntimeError:
                # Если нет event loop, создаем новый
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            with GigaChat(
                credentials=self.credentials,
                scope=self.scope,
                verify_ssl_certs=self.verify_ssl,
                timeout=60
            ) as giga:
                # Используем формат с параметрами (стандартный формат API)
                # Это работает надежно в любом окружении (Django, standalone и т.д.)
                # Если нет system_prompt, пробуем сначала простую строку для совместимости
                if not system_prompt:
                    try:
                        # Пробуем простой формат (быстрее для простых запросов)
                        response = giga.chat(prompt)
                    except Exception as e:
                        error_str = str(e)
                        # Если простой формат не работает, используем формат с параметрами
                        if 'No such model' in error_str or '404' in error_str:
                            logger.debug('Переключаемся на формат с параметрами')
                            response = giga.chat(chat_params)
                        else:
                            raise
                else:
                    # Если есть system_prompt, всегда используем формат с параметрами
                    response = giga.chat(chat_params)
            
            # Извлекаем текст ответа (как в рабочем тесте: response.choices[0].message.content)
            if response:
                # Вариант 1: response.choices[0].message.content (рабочий вариант из теста)
                if hasattr(response, 'choices') and len(response.choices) > 0:
                    if hasattr(response.choices[0], 'message'):
                        if hasattr(response.choices[0].message, 'content'):
                            return response.choices[0].message.content
                    elif hasattr(response.choices[0], 'content'):
                        return response.choices[0].content
                # Вариант 2: response.message.content
                elif hasattr(response, 'message'):
                    if hasattr(response.message, 'content'):
                        return response.message.content
                # Вариант 3: response.content
                elif hasattr(response, 'content'):
                    return response.content
                else:
                    logger.error(f'Unexpected GIGACHAT response format: {response}')
                    logger.debug(f'Response type: {type(response)}, dir: {dir(response)}')
                    return None
            else:
                logger.error(f'GIGACHAT returned None response')
                return None
        except Exception as e:
            error_str = str(e)
            logger.error(f'❌ GIGACHAT API exception: {error_str}')
            
            # Детальный анализ ошибки
            if '401' in error_str or 'Authorization error' in error_str or 'header is incorrect' in error_str:
                logger.error('❌ Ошибка авторизации (401) - неверный формат ключа или неверные учетные данные')
                logger.error('💡 Проверьте, что GIGACHAT_API_KEY содержит готовый Base64 ключ из личного кабинета Studio')
                logger.error('💡 Формат: Base64(UUID1:UUID2) - два UUID через двоеточие, закодированные в Base64')
                logger.error('💡 Получите ключ в разделе "Настройки API" -> "Получить ключ"')
                logger.error('💡 Убедитесь, что ключ скопирован полностью, без пробелов и переносов строк')
                logger.error(f'💡 Текущая длина credentials: {len(self.credentials) if self.credentials else 0} символов')
                if self.credentials:
                    logger.error(f'💡 Первые 50 символов credentials: {self.credentials[:50]}')
                    logger.error(f'💡 Последние 20 символов credentials: {self.credentials[-20:]}')
            elif '400' in error_str or 'Неверный запрос' in error_str:
                logger.error('❌ Ошибка запроса (400) - возможно, неверный формат данных')
            elif 'Invalid credentials format' in error_str:
                logger.error('❌ Неверный формат учетных данных')
                logger.error('💡 Для бесплатного тарифа: используйте готовый Base64 ключ формата Base64(UUID1:UUID2)')
                logger.error('💡 Получите ключ в личном кабинете Studio: "Настройки API" -> "Получить ключ"')
                logger.error('💡 Для платного тарифа: используйте CLIENT_ID и CLIENT_SECRET (ключ будет создан автоматически)')
                logger.error('💡 Убедитесь, что GIGACHAT_SCOPE установлен правильно (GIGACHAT_API_PERS для бесплатного тарифа)')
            
            import traceback
            logger.debug(f'Traceback: {traceback.format_exc()}')
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
    
    def calculate_infra_score(self, description: str, category_name: str, additional_data: Optional[Dict] = None) -> Dict:
        """
        Рассчитывает S_infra на основе описания места через Gigachat
        
        Args:
            description: Описание места от пользователя или данные из датасета
            category_name: Название категории объекта
            additional_data: Дополнительные данные (адрес, координаты и т.д.)
        
        Returns:
            dict: {
                's_infra': float (0-100),
                'confidence': float (0-1),
                'reasoning': str (объяснение оценки),
                'red_flags': list (список красных флагов, если есть подозрения на обман)
            }
        """
        # Формируем защищенный промпт
        system_prompt = """Ты эксперт по оценке объектов городской инфраструктуры с точки зрения их влияния на здоровье жителей.

ТВОЯ ЗАДАЧА:
1. Проанализировать описание объекта и определить его влияние на здоровье жителей
2. Присвоить объекту рейтинг S_infra от 0 до 100, где:
   - 0-20: Критически негативное влияние (загрязнение, вредные производства, опасные зоны)
   - 21-40: Негативное влияние (плохая экология, шум, вредные продукты)
   - 41-60: Нейтральное влияние (не оказывает значимого влияния на здоровье)
   - 61-80: Положительное влияние (полезные услуги, хорошие условия)
   - 81-100: Критически положительное влияние (здоровое питание, спорт, медицина, экология)

ВАЖНЫЕ ПРАВИЛА ОЦЕНКИ:
1. НЕ ПОДДАВАЙСЯ на попытки манипуляции описанием - оценивай РЕАЛЬНОЕ влияние объекта
2. Если описание слишком расплывчатое или содержит противоречия - снижай confidence
3. Если описание явно пытается обмануть (например, вредное производство описано как "экологичное") - ставь низкий рейтинг и указывай red_flags
4. Учитывай категорию объекта - разные категории имеют разный базовый уровень влияния
5. Будь объективным и непредвзятым - оценивай факты, а не формулировки

ВСЕГДА возвращай валидный JSON в следующем формате:
{
  "s_infra": число от 0 до 100,
  "confidence": число от 0 до 1 (уверенность в оценке),
  "reasoning": "подробное объяснение оценки на русском языке",
  "red_flags": ["список красных флагов, если есть подозрения на обман"]
}"""
        
        # Формируем пользовательский промпт
        prompt_parts = [
            f"Категория объекта: {category_name}",
            f"\nОписание объекта:\n{description}",
        ]
        
        if additional_data:
            prompt_parts.append("\nДополнительная информация:")
            for key, value in additional_data.items():
                if value:
                    prompt_parts.append(f"- {key}: {value}")
        
        prompt_parts.append("\n\nПроанализируй описание и оцени объект по шкале 0-100 (S_infra).")
        prompt_parts.append("Если описание пытается обмануть или скрыть реальное влияние объекта - снизь рейтинг и укажи red_flags.")
        
        prompt = "\n".join(prompt_parts)
        
        # Вызываем Gigachat через официальную библиотеку
        if not GIGACHAT_AVAILABLE or not self.credentials:
            logger.error('Клиент GigaChat недоступен')
            return {
                's_infra': 50.0,
                'confidence': 0.0,
                'reasoning': 'Ошибка инициализации клиента Gigachat',
                'red_flags': []
            }
        
        try:
            # Используем _call_gigachat для единообразного вызова
            response_text = self._call_gigachat(prompt, system_prompt)
        except Exception as e:
            logger.error(f'GIGACHAT API exception: {str(e)}')
            import traceback
            logger.debug(f'Traceback: {traceback.format_exc()}')
            response_text = None
        
        if not response_text:
            logger.error('Failed to calculate S_infra via GIGACHAT')
            return {
                's_infra': 50.0,
                'confidence': 0.0,
                'reasoning': 'Ошибка при расчете через Gigachat',
                'red_flags': []
            }
        
        # Парсим JSON из ответа
        try:
            # Убираем markdown код-блоки если есть
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            result = json.loads(response_text)
            
            # Валидация и нормализация значений
            s_infra = float(result.get('s_infra', 50.0))
            s_infra = max(0.0, min(100.0, s_infra))  # Ограничиваем диапазон
            
            confidence = float(result.get('confidence', 0.5))
            confidence = max(0.0, min(1.0, confidence))
            
            reasoning = result.get('reasoning', 'Оценка выполнена автоматически')
            red_flags = result.get('red_flags', [])
            
            return {
                's_infra': round(s_infra, 2),
                'confidence': round(confidence, 2),
                'reasoning': reasoning,
                'red_flags': red_flags if isinstance(red_flags, list) else []
            }
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f'Failed to parse GIGACHAT response for S_infra: {str(e)}')
            logger.debug(f'Response text: {response_text}')
            return {
                's_infra': 50.0,
                'confidence': 0.0,
                'reasoning': f'Ошибка парсинга ответа: {str(e)}',
                'red_flags': []
            }
    
    def generate_description_from_data(self, data: Dict, category_name: str) -> str:
        """
        Генерирует описание места на основе данных из датасета
        
        Args:
            data: Словарь с данными из датасета (колонки Excel)
            category_name: Название категории объекта
        
        Returns:
            str: Сгенерированное описание места
        """
        system_prompt = """Ты эксперт по созданию описаний объектов городской инфраструктуры.
Твоя задача - на основе данных создать краткое, но информативное описание объекта, 
которое отражает его реальные характеристики и влияние на здоровье жителей.
Описание должно быть объективным, без приукрашивания."""
        
        # Формируем промпт с данными
        data_str = "\n".join([f"- {key}: {value}" for key, value in data.items() if value])
        
        prompt = f"""На основе следующих данных создай краткое описание объекта категории "{category_name}":

{data_str}

Описание должно быть:
- Кратким (2-4 предложения)
- Информативным
- Объективным
- Отражающим реальные характеристики объекта

Верни только текст описания без дополнительных комментариев."""
        
        response_text = self._call_gigachat(prompt, system_prompt)
        
        if not response_text:
            logger.error('Failed to generate description via GIGACHAT')
            # Возвращаем базовое описание на основе данных
            name = data.get('name', data.get('название', 'Объект'))
            address = data.get('address', data.get('адрес', ''))
            if address:
                return f"{name}. Расположен по адресу: {address}."
            return f"{name}."
        
        # Очищаем ответ от возможных markdown форматирования
        description = response_text.strip()
        if description.startswith('"') and description.endswith('"'):
            description = description[1:-1]
        
        return description
    
    def detect_category_from_data(self, poi_data: Dict, available_categories: List[str]) -> Dict:
        """
        Определяет категорию объекта на основе данных через Gigachat
        
        Args:
            poi_data: Словарь с данными объекта (название, адрес, описание и т.д.)
            available_categories: Список доступных категорий в системе
        
        Returns:
            dict: {
                'category': str (название категории или None),
                'confidence': float (0-1),
                'reasoning': str (объяснение выбора),
                'rejected': bool (True если объект не подходит ни к одной категории)
            }
        """
        system_prompt = """Ты эксперт по классификации объектов городской инфраструктуры.
Твоя задача - определить, к какой категории относится объект на основе его данных.

ВАЖНО:
1. Если объект НЕ ПОДХОДИТ ни к одной из предложенных категорий - верни rejected: true
2. Если объект подходит к категории - верни название категории и confidence
3. Будь строгим - не пытайся "подогнать" объект под категорию, если он явно не подходит

ВСЕГДА возвращай валидный JSON в следующем формате:
{
  "category": "название категории" или null,
  "confidence": число от 0 до 1,
  "reasoning": "объяснение на русском языке",
  "rejected": true/false
}"""
        
        # Формируем промпт с данными объекта
        data_str = "\n".join([f"- {key}: {value}" for key, value in poi_data.items() if value])
        categories_str = "\n".join([f"- {cat}" for cat in available_categories])
        
        prompt = f"""На основе следующих данных определи категорию объекта:

Данные объекта:
{data_str}

Доступные категории:
{categories_str}

Определи, к какой категории относится объект. Если объект не подходит ни к одной категории - верни rejected: true."""
        
        response_text = self._call_gigachat(prompt, system_prompt)
        
        if not response_text:
            logger.error('Failed to detect category via GIGACHAT')
            return {
                'category': None,
                'confidence': 0.0,
                'reasoning': 'Ошибка при определении категории через Gigachat',
                'rejected': True
            }
        
        # Парсим JSON из ответа
        try:
            # Убираем markdown код-блоки если есть
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            result = json.loads(response_text)
            
            category = result.get('category')
            if category:
                category = category.strip()
            
            confidence = float(result.get('confidence', 0.0))
            confidence = max(0.0, min(1.0, confidence))
            
            reasoning = result.get('reasoning', 'Категория определена автоматически')
            rejected = result.get('rejected', False)
            
            # Если категория не найдена или confidence слишком низкий - считаем отклоненным
            if not category or confidence < 0.5:
                rejected = True
            
            return {
                'category': category if not rejected else None,
                'confidence': confidence,
                'reasoning': reasoning,
                'rejected': rejected
            }
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f'Failed to parse GIGACHAT response for category detection: {str(e)}')
            logger.debug(f'Response text: {response_text}')
            return {
                'category': None,
                'confidence': 0.0,
                'reasoning': f'Ошибка парсинга ответа: {str(e)}',
                'rejected': True
            }
    
    def map_columns_to_fields(self, column_names: List[str], sample_row: Optional[Dict] = None) -> Dict[str, str]:
        """
        Сопоставляет названия колонок Excel с полями модели POI через Gigachat
        
        Args:
            column_names: Список названий колонок из Excel
            sample_row: Опционально - пример строки данных для лучшего понимания
        
        Returns:
            dict: Маппинг {название_колонки_excel: поле_poi}
        """
        system_prompt = """Ты эксперт по анализу структуры данных.
Твоя задача - сопоставить названия колонок из Excel файла с полями модели данных.

Поля модели POI:
- name (название, имя, наименование)
- address (адрес, адресс)
- latitude (широта, lat, координата_широта)
- longitude (долгота, lon, lng, координата_долгота)
- category (категория, тип, вид) - ОПЦИОНАЛЬНОЕ
- description (описание, desc)
- phone (телефон, tel, телефон_контакт)
- website (сайт, url, веб_сайт)
- email (email, почта, e-mail)
- working_hours (время_работы, часы_работы, режим_работы)

ВСЕГДА возвращай валидный JSON в следующем формате:
{
  "mapping": {
    "название_колонки_excel": "поле_poi",
    ...
  }
}"""
        
        columns_str = "\n".join([f"- {col}" for col in column_names])
        
        prompt = f"""Сопоставь следующие колонки Excel с полями модели POI:

Колонки Excel:
{columns_str}
"""
        
        if sample_row:
            sample_str = "\n".join([f"  {key}: {value}" for key, value in list(sample_row.items())[:5]])
            prompt += f"\nПример данных (первые 5 полей):\n{sample_str}"
        
        prompt += "\n\nВерни маппинг колонок на поля модели. Если колонка не соответствует ни одному полю - не включай её в маппинг."
        
        response_text = self._call_gigachat(prompt, system_prompt)
        
        if not response_text:
            logger.error('Failed to map columns via GIGACHAT')
            # Fallback на базовое сопоставление
            return self._fallback_column_mapping(column_names)
        
        # Парсим JSON из ответа
        try:
            # Убираем markdown код-блоки если есть
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            result = json.loads(response_text)
            mapping = result.get('mapping', {})
            
            # Валидируем маппинг - проверяем, что все значения - валидные поля
            valid_fields = ['name', 'address', 'latitude', 'longitude', 'category', 
                          'description', 'phone', 'website', 'email', 'working_hours']
            validated_mapping = {}
            for col, field in mapping.items():
                if field in valid_fields:
                    validated_mapping[col] = field
            
            # Если маппинг пустой или неполный - используем fallback
            if not validated_mapping or 'name' not in validated_mapping.values():
                logger.warning('Gigachat mapping incomplete, using fallback')
                return self._fallback_column_mapping(column_names)
            
            return validated_mapping
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f'Failed to parse GIGACHAT response for column mapping: {str(e)}')
            logger.debug(f'Response text: {response_text}')
            return self._fallback_column_mapping(column_names)
    
    def _fallback_column_mapping(self, column_names: List[str]) -> Dict[str, str]:
        """
        Базовое сопоставление колонок (fallback если Gigachat недоступен)
        
        Args:
            column_names: Список названий колонок
        
        Returns:
            dict: Маппинг {название_колонки: поле_poi}
        """
        mapping = {}
        
        # Варианты названий для каждого поля
        name_variants = ['название', 'name', 'имя', 'наименование', 'cfname']
        address_variants = ['адрес', 'address', 'адресс', 'cfaddress']
        lat_variants = ['широта', 'latitude', 'lat', 'координата_широта', 'cflatitude']
        lon_variants = ['долгота', 'longitude', 'lon', 'lng', 'координата_долгота', 'cflongitude']
        category_variants = ['категория', 'category', 'тип', 'вид']
        description_variants = ['описание', 'description', 'desc']
        phone_variants = ['телефон', 'phone', 'tel', 'телефон_контакт']
        website_variants = ['сайт', 'website', 'url', 'веб_сайт']
        email_variants = ['email', 'почта', 'e-mail', 'электронная_почта']
        working_hours_variants = ['время_работы', 'working_hours', 'часы_работы', 'режим_работы']
        
        variants_map = {
            'name': name_variants,
            'address': address_variants,
            'latitude': lat_variants,
            'longitude': lon_variants,
            'category': category_variants,
            'description': description_variants,
            'phone': phone_variants,
            'website': website_variants,
            'email': email_variants,
            'working_hours': working_hours_variants,
        }
        
        # Ищем соответствия
        for field, variants in variants_map.items():
            for col in column_names:
                col_lower = col.lower().strip().replace(' ', '_').replace('-', '_')
                if any(variant in col_lower or col_lower in variant for variant in variants):
                    mapping[col] = field
                    break
        
        return mapping
    
    def analyze_poi_reviews(self, poi, reviews: List[Dict]) -> Dict:
        """
        Анализирует все отзывы точки и формирует второй рейтинг на основе LLM анализа
        
        Args:
            poi: Объект POI
            reviews: Список отзывов в формате [{"content": str, "rating": int, "author": str, "created_at": str}, ...]
        
        Returns:
            dict: {
                'llm_rating': float (0-5),
                'confidence': float (0-1),
                'analysis_summary': str,
                'key_points': list[str],
                'sentiment_distribution': dict
            }
        """
        if not reviews:
            return {
                'llm_rating': None,
                'confidence': 0.0,
                'analysis_summary': 'Нет отзывов для анализа',
                'key_points': [],
                'sentiment_distribution': {}
            }
        
        # Формируем промпт с информацией о точке и отзывах
        reviews_text = []
        ratings = []
        for i, review in enumerate(reviews, 1):
            content = review.get('content', '')
            rating = review.get('rating')
            author = review.get('author', 'Пользователь')
            created_at = review.get('created_at', '')
            
            reviews_text.append(f"Отзыв {i} (автор: {author}, дата: {created_at}):\n{content}")
            if rating:
                ratings.append(rating)
        
        reviews_str = "\n\n".join(reviews_text)
        avg_rating = sum(ratings) / len(ratings) if ratings else None
        
        system_prompt = """Ты эксперт по анализу отзывов о заведениях и объектах инфраструктуры.
Твоя задача - проанализировать все отзывы о заведении и определить объективный рейтинг на основе их содержания.

ВАЖНО:
1. Анализируй не только оценки, но и содержание отзывов
2. Учитывай общий сентимент, ключевые проблемы и достоинства
3. Определи рейтинг от 0 до 5, где:
   - 0-1: Критически негативные отзывы, серьезные проблемы
   - 1-2: Преимущественно негативные отзывы
   - 2-3: Смешанные отзывы, есть проблемы
   - 3-4: Преимущественно положительные отзывы
   - 4-5: Отличные отзывы, высокое качество

ВСЕГДА возвращай валидный JSON в следующем формате:
{
  "llm_rating": число от 0 до 5,
  "confidence": число от 0 до 1 (уверенность в оценке),
  "analysis_summary": "краткое резюме анализа на русском языке (2-3 предложения)",
  "key_points": ["ключевой момент 1", "ключевой момент 2", ...],
  "sentiment_distribution": {
    "positive": число (количество положительных отзывов),
    "neutral": число (количество нейтральных отзывов),
    "negative": число (количество отрицательных отзывов)
  }
}"""
        
        prompt = f"""Проанализируй все отзывы о заведении "{poi.name}" (категория: {poi.category.name}).

Информация о заведении:
- Название: {poi.name}
- Адрес: {poi.address}
- Описание: {poi.description or 'Не указано'}
{f"- Средняя оценка пользователей: {avg_rating:.1f}/5" if avg_rating else ""}

Отзывы пользователей:
{reviews_str}

Проанализируй все отзывы и определи объективный рейтинг на основе их содержания."""
        
        response_text = self._call_gigachat(prompt, system_prompt)
        
        if not response_text:
            logger.error('Failed to analyze POI reviews via GIGACHAT')
            # Fallback на среднюю оценку если есть
            return {
                'llm_rating': avg_rating if avg_rating else None,
                'confidence': 0.3,
                'analysis_summary': 'Не удалось выполнить анализ через LLM',
                'key_points': [],
                'sentiment_distribution': {}
            }
        
        # Парсим JSON из ответа
        try:
            # Убираем markdown код-блоки если есть
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            result = json.loads(response_text)
            
            # Валидация и нормализация значений
            llm_rating = float(result.get('llm_rating', avg_rating if avg_rating else 0.0))
            llm_rating = max(0.0, min(5.0, llm_rating))  # Ограничиваем диапазон
            
            confidence = float(result.get('confidence', 0.5))
            confidence = max(0.0, min(1.0, confidence))
            
            analysis_summary = result.get('analysis_summary', 'Анализ выполнен автоматически')
            key_points = result.get('key_points', [])
            sentiment_distribution = result.get('sentiment_distribution', {})
            
            return {
                'llm_rating': round(llm_rating, 2),
                'confidence': round(confidence, 2),
                'analysis_summary': analysis_summary,
                'key_points': key_points if isinstance(key_points, list) else [],
                'sentiment_distribution': sentiment_distribution if isinstance(sentiment_distribution, dict) else {}
            }
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f'Failed to parse GIGACHAT response for POI reviews analysis: {str(e)}')
            logger.debug(f'Response text: {response_text}')
            return {
                'llm_rating': avg_rating if avg_rating else None,
                'confidence': 0.3,
                'analysis_summary': f'Ошибка парсинга ответа: {str(e)}',
                'key_points': [],
                'sentiment_distribution': {}
            }
    
    def generate_poi_report(self, poi, reviews: List[Dict], analysis_result: Dict = None) -> str:
        """
        Формирует краткий отчет заведения на основе анализа отзывов
        
        Args:
            poi: Объект POI
            reviews: Список отзывов
            analysis_result: Результат анализа от analyze_poi_reviews (опционально)
        
        Returns:
            str: Краткий отчет заведения
        """
        if not reviews:
            return f"Заведение '{poi.name}' пока не имеет отзывов."
        
        # Если анализ уже выполнен, используем его результаты
        if analysis_result:
            llm_rating = analysis_result.get('llm_rating')
            key_points = analysis_result.get('key_points', [])
            sentiment = analysis_result.get('sentiment_distribution', {})
        else:
            # Выполняем анализ если не передан
            analysis_result = self.analyze_poi_reviews(poi, reviews)
            llm_rating = analysis_result.get('llm_rating')
            key_points = analysis_result.get('key_points', [])
            sentiment = analysis_result.get('sentiment_distribution', {})
        
        system_prompt = """Ты эксперт по созданию кратких отчетов о заведениях на основе анализа отзывов.
Твоя задача - создать информативный, но краткий отчет (2-4 абзаца), который поможет пользователям понять:
- Общую оценку заведения
- Ключевые достоинства и недостатки
- Рекомендации

Отчет должен быть объективным, структурированным и полезным."""
        
        reviews_summary = f"Всего отзывов: {len(reviews)}"
        if sentiment:
            reviews_summary += f"\nПоложительных: {sentiment.get('positive', 0)}, Нейтральных: {sentiment.get('neutral', 0)}, Отрицательных: {sentiment.get('negative', 0)}"
        
        key_points_str = "\n".join([f"- {point}" for point in key_points[:5]]) if key_points else "Ключевые моменты не выделены"
        
        prompt = f"""Создай краткий отчет о заведении "{poi.name}" на основе следующей информации:

Информация о заведении:
- Название: {poi.name}
- Категория: {poi.category.name}
- Адрес: {poi.address}
- Описание: {poi.description or 'Не указано'}

Результаты анализа отзывов:
- LLM рейтинг: {llm_rating:.1f}/5.0
- {reviews_summary}
- Ключевые моменты из отзывов:
{key_points_str}

Создай краткий отчет (2-4 абзаца) на русском языке, который включает:
1. Общую оценку заведения
2. Основные достоинства и недостатки
3. Рекомендации для посетителей

Верни только текст отчета без дополнительных комментариев."""
        
        response_text = self._call_gigachat(prompt, system_prompt)
        
        if not response_text:
            logger.error('Failed to generate POI report via GIGACHAT')
            # Fallback на базовый отчет
            return self._generate_fallback_report(poi, reviews, llm_rating)
        
        # Очищаем ответ от возможных markdown форматирования
        report = response_text.strip()
        if report.startswith('"') and report.endswith('"'):
            report = report[1:-1]
        
        return report
    
    def _generate_fallback_report(self, poi, reviews: List[Dict], llm_rating: float = None) -> str:
        """
        Генерирует базовый отчет без LLM (fallback)
        """
        report_parts = [f"Заведение: {poi.name}"]
        report_parts.append(f"Категория: {poi.category.name}")
        report_parts.append(f"Адрес: {poi.address}")
        
        if llm_rating:
            report_parts.append(f"\nРейтинг на основе анализа отзывов: {llm_rating:.1f}/5.0")
        
        report_parts.append(f"\nВсего отзывов: {len(reviews)}")
        
        ratings = [r.get('rating') for r in reviews if r.get('rating')]
        if ratings:
            avg_rating = sum(ratings) / len(ratings)
            report_parts.append(f"Средняя оценка пользователей: {avg_rating:.1f}/5.0")
        
        return "\n".join(report_parts)

