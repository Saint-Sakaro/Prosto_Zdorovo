# 📋 Техническое задание для фронтендера

## Обзор изменений

На бэкенде реализована **система динамических анкет и расчета рейтингов** для POI объектов. Нужно обновить фронтенд для поддержки нового функционала.

---

## ✅ Что НЕ нужно менять (работает как есть)

1. **Существующие API эндпоинты** - все продолжают работать
2. **Карта и отображение POI** - без изменений
3. **Создание отзывов** - работает как раньше (новые поля опциональны)

---

## 🔧 Что НУЖНО обновить

### 1. Обновить TypeScript типы

#### 📁 `frontend/src/api/maps.ts`

**1.1. Обновить интерфейс `POI`** (добавить новые поля):

```typescript
export interface POI {
  uuid: string;
  name: string;
  category_name: string;
  category_slug: string;
  address: string;
  latitude: number;
  longitude: number;
  marker_color: string;
  health_score: number;
  
  // ⬇️ НОВЫЕ ПОЛЯ (опционально, если не заполнено)
  form_data?: Record<string, any>;  // Данные анкеты
  verified?: boolean;                // Верифицирован ли объект
  form_schema?: string;              // UUID схемы анкеты
}
```

**1.2. Обновить интерфейс `POIDetails`** (добавить новые поля):

```typescript
export interface POIDetails {
  // ... существующие поля ...
  
  // ⬇️ НОВЫЕ ПОЛЯ
  form_data?: Record<string, any>;
  verified?: boolean;
  verified_by?: number | null;
  verified_at?: string | null;
  form_schema?: string;
  
  rating: {
    health_score: number;
    reviews_count: number;
    approved_reviews_count: number;
    
    // ⬇️ НОВЫЕ ПОЛЯ рейтинга
    S_infra?: number;      // Инфраструктурный рейтинг (0-100)
    S_social?: number;     // Социальный рейтинг (0-100)
    S_HIS?: number;        // Health Impact Score (0-100)
    last_infra_calculation?: string;
    last_social_calculation?: string;
    calculation_metadata?: Record<string, any>;
  };
}
```

**1.3. Обновить интерфейс `Review`** в `frontend/src/api/gamification.ts`:

```typescript
export interface Review {
  uuid: string;
  author: number;
  author_username: string;
  review_type: 'poi_review' | 'incident';
  latitude: number;
  longitude: number;
  category: string;
  content: string;
  has_media: boolean;
  is_unique: boolean;
  moderation_status: 'pending' | 'approved' | 'soft_reject' | 'spam_blocked';
  moderated_by: number | null;
  moderated_by_username: string | null;
  moderated_at: string | null;
  moderation_comment: string;
  created_at: string;
  updated_at: string;
  
  // ⬇️ НОВЫЕ ПОЛЯ
  rating?: number | null;              // Оценка отзыва (1-5)
  poi?: string | null;                 // UUID POI (если есть связь)
  sentiment_score?: number | null;     // Сентимент от LLM (-1 до 1)
  extracted_facts?: Record<string, any>; // Извлеченные факты от LLM
}
```

---

### 2. Добавить новые API методы

#### 📁 `frontend/src/api/maps.ts` (добавить в конец файла)

```typescript
// ⬇️ НОВЫЕ ТИПЫ ДЛЯ АНКЕТ И РЕЙТИНГОВ

export interface FormField {
  id: string;
  type: 'boolean' | 'range' | 'select' | 'photo';
  label: string;
  description?: string;
  direction: 1 | -1;  // +1 полезный, -1 вредный
  weight: number;
  scale_min?: number;  // для range
  scale_max?: number;  // для range
  options?: string[];  // для select
  mapping?: Record<string, number>;  // для select
}

export interface FormSchema {
  uuid: string;
  category: number;  // ID категории
  category_name: string;
  name: string;
  schema_json: {
    fields: FormField[];
    version?: string;
  };
  version: string;
  generated_by_llm: boolean;
  llm_prompt?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'archived';
  approved_by?: number | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface POIRatingDetails {
  uuid: string;
  poi: string;  // UUID POI
  poi_name: string;
  poi_category: string;
  S_infra: number;
  S_social: number;
  S_HIS: number;
  health_score: number;  // Алиас для S_HIS (для обратной совместимости)
  reviews_count: number;
  approved_reviews_count: number;
  last_infra_calculation: string | null;
  last_social_calculation: string | null;
  calculation_metadata: Record<string, any>;
}

// ⬇️ НОВЫЕ API МЕТОДЫ

export const ratingsApi = {
  // Получение схем анкет
  getFormSchemas: async (params?: {
    category?: string;  // slug категории
  }): Promise<{ count: number; results: FormSchema[] }> => {
    const response = await apiClient.get('/maps/ratings/form-schemas/', { params });
    return response.data;
  },

  // Получение схемы по ID
  getFormSchema: async (uuid: string): Promise<FormSchema> => {
    const response = await apiClient.get(`/maps/ratings/form-schemas/${uuid}/`);
    return response.data;
  },

  // Генерация схемы через LLM
  generateFormSchema: async (data: {
    category_id: number;
    category_description?: string;
  }): Promise<FormSchema> => {
    const response = await apiClient.post(
      '/maps/ratings/form-schemas/generate-for-category/',
      data
    );
    return response.data;
  },

  // Обновление данных анкеты объекта
  updatePOIFormData: async (
    poiUuid: string,
    formData: Record<string, any>
  ): Promise<POIDetails> => {
    const response = await apiClient.put(
      `/maps/ratings/pois/${poiUuid}/form-data/`,
      { form_data: formData }
    );
    return response.data;
  },

  // Получение рейтинга объекта
  getPOIRating: async (ratingId: number): Promise<POIRatingDetails> => {
    const response = await apiClient.get(`/maps/ratings/ratings/${ratingId}/`);
    return response.data;
  },

  // Пересчет рейтинга (для админов)
  recalculateRating: async (ratingId: number): Promise<POIRatingDetails> => {
    const response = await apiClient.post(`/maps/ratings/ratings/${ratingId}/recalculate/`);
    return response.data;
  },
};
```

---

### 3. Обновить форму создания отзыва

#### 📁 `frontend/src/api/gamification.ts` - обновить метод `createReview`

```typescript
createReview: async (reviewData: {
  review_type: 'poi_review' | 'incident';
  latitude: number;
  longitude: number;
  category: string;
  content: string;
  has_media: boolean;
  
  // ⬇️ НОВЫЕ ОПЦИОНАЛЬНЫЕ ПОЛЯ
  rating?: number;        // Оценка 1-5 (для poi_review)
  poi?: string;          // UUID POI (если известен)
}): Promise<Review> => {
  const response = await apiClient.post('/gamification/reviews/', reviewData);
  return response.data;
},
```

#### 📁 `frontend/src/components/reviews/ReviewForm.tsx`

**Добавить поле для оценки:**

```typescript
// Добавить в состояние
const [rating, setRating] = useState<number | null>(null);

// Добавить в форму (только для poi_review)
{reviewType === 'poi_review' && (
  <div>
    <label>Оценка (1-5):</label>
    <input
      type="number"
      min="1"
      max="5"
      value={rating || ''}
      onChange={(e) => setRating(e.target.value ? parseInt(e.target.value) : null)}
    />
  </div>
)}

// Добавить в onSubmit
await onSubmit({
  // ... существующие поля ...
  rating: rating || undefined,
});
```

---

### 4. Обновить отображение рейтинга в POIModal

#### 📁 `frontend/src/components/map/POIModal.tsx`

**Добавить отображение компонентов рейтинга:**

```typescript
// Если есть детальные данные рейтинга
{poi.rating.S_infra !== undefined && (
  <div>
    <h3>Компоненты рейтинга:</h3>
    <div>
      <span>Инфраструктурный: {poi.rating.S_infra.toFixed(1)}</span>
      <span>Социальный: {poi.rating.S_social.toFixed(1)}</span>
      <span>Итоговый HIS: {poi.rating.S_HIS.toFixed(1)}</span>
    </div>
  </div>
)}

// Верификация
{poi.verified && (
  <Badge>✅ Верифицирован</Badge>
)}
```

---

### 5. Новые компоненты (ОПЦИОНАЛЬНО)

Если хотите добавить полный функционал:

#### 5.1. Компонент заполнения анкеты объекта

**📁 `frontend/src/components/poi/POIFormEditor.tsx`**

Компонент для заполнения динамической анкеты объекта на основе схемы.

**Функциональность:**
- Получение схемы анкеты для категории
- Динамическое создание полей формы на основе схемы
- Сохранение данных анкеты
- Валидация данных

#### 5.2. Компонент просмотра рейтинга

**📁 `frontend/src/components/poi/RatingDetails.tsx`**

Компонент для детального отображения рейтинга с графиками.

**Функциональность:**
- Отображение S_infra, S_social, S_HIS
- Графики компонентов рейтинга
- История изменений
- Метаданные расчета

#### 5.3. Компонент генерации схемы (для админов)

**📁 `frontend/src/components/admin/FormSchemaGenerator.tsx`**

Компонент для генерации схем анкет через LLM.

**Функциональность:**
- Выбор категории
- Генерация схемы через LLM
- Редактирование сгенерированной схемы
- Утверждение схемы

---

## 📝 Приоритет обновлений

### 🔴 КРИТИЧНО (нужно сделать обязательно)

1. ✅ Обновить типы `POI`, `POIDetails`, `Review` - **БЕЗ ЭТОГО ТИПЫ БУДУТ НЕКОРРЕКТНЫ**
2. ✅ Добавить новые поля в интерфейсы рейтинга
3. ✅ Поддержать новое поле `rating` в форме создания отзыва

### 🟡 ЖЕЛАТЕЛЬНО (для полной функциональности)

4. ✅ Отображать новые компоненты рейтинга (S_infra, S_social, S_HIS) в POIModal
5. ✅ Добавить отображение верификации объекта

### 🟢 ОПЦИОНАЛЬНО (можно сделать позже)

6. ⚪ Компонент заполнения анкеты объекта
7. ⚪ Компонент детального просмотра рейтинга
8. ⚪ Генерация схем через LLM (для админов)

---

## 🔄 Обратная совместимость

### ✅ Все существующие функции работают:

- Карта и отображение POI - **работает без изменений**
- Создание отзывов - **работает без изменений** (новые поля опциональны)
- Просмотр отзывов - **работает без изменений**
- Анализ области - **работает без изменений**

### ⚠️ Новые поля опциональны:

Все новые поля имеют значения по умолчанию или являются опциональными:
- Если `S_infra`, `S_social`, `S_HIS` нет - используется `health_score`
- Если `rating` нет в отзыве - отзыв работает как раньше
- Если анкета не заполнена - объект работает как раньше

---

## 🚀 Примеры использования новых API

### Получение схем анкет

```typescript
import { ratingsApi } from '../api/maps';

// Получить все схемы
const schemas = await ratingsApi.getFormSchemas();

// Получить схемы для категории
const schemasForCategory = await ratingsApi.getFormSchemas({
  category: 'apteki'
});
```

### Обновление данных анкеты

```typescript
// Заполнить анкету для объекта
await ratingsApi.updatePOIFormData(poiUuid, {
  'has_wheelchair_access': true,
  'opening_hours': 8,
  'parking_available': false
});
```

### Создание отзыва с оценкой

```typescript
await gamificationApi.createReview({
  review_type: 'poi_review',
  latitude: 55.7558,
  longitude: 37.6173,
  category: 'apteki',
  content: 'Отличная аптека!',
  has_media: false,
  rating: 5,  // ⬅️ НОВОЕ ПОЛЕ
  poi: poiUuid  // ⬅️ НОВОЕ ПОЛЕ (если известно)
});
```

---

## 📋 Чеклист для фронтендера

### Обязательные обновления:

- [ ] Обновить типы `POI` и `POIDetails` (добавить новые поля)
- [ ] Обновить тип `Review` (добавить rating, poi, sentiment_score)
- [ ] Добавить новые API методы в `maps.ts`
- [ ] Поддержать поле `rating` в форме создания отзыва
- [ ] Обновить отображение рейтинга в POIModal

### Опциональные улучшения:

- [ ] Создать компонент заполнения анкеты
- [ ] Создать компонент детального просмотра рейтинга
- [ ] Добавить визуализацию компонентов рейтинга
- [ ] Создать админ-панель для управления схемами

---

## ❓ Вопросы?

Если что-то непонятно - спрашивайте! Все изменения обратно совместимы, существующий функционал продолжит работать.

---

**Дата:** 2025-12-06  
**Статус:** ✅ Бэкенд готов, ожидает обновления фронтенда

