# ТЗ для фронтендера: Система создания мест

## 📋 Обзор задачи

Реализовать интерфейс для создания мест с динамическими формами на основе категорий. Система должна поддерживать:
1. Ручное создание места пользователем
2. Массовую загрузку датасета модератором
3. Модерацию заявок (с отображением вердикта LLM)
4. Редактор категорий для модераторов

---

## 🎯 ЭТАП 1: Ручное создание места пользователем

### Задача 1.1: Создать компонент формы создания места

**Файл:** `frontend/src/components/places/CreatePlaceForm.tsx`

```typescript
/**
 * TODO: Создать компонент формы создания места
 * 
 * Компонент должен:
 * 1. Позволить выбрать адрес или поставить метку на карте
 * 2. Показать список категорий для выбора
 * 3. Динамически отобразить поля формы на основе выбранной категории
 * 4. Валидировать форму перед отправкой
 * 5. Отправить заявку на создание места
 */

import React, { useState, useEffect } from 'react';
import { MapContainer, Marker, useMapEvents } from 'react-leaflet';
import { useForm, Controller } from 'react-hook-form';

interface CreatePlaceFormProps {
  onSubmit: (data: PlaceSubmissionData) => Promise<void>;
  onCancel: () => void;
}

interface PlaceSubmissionData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category_slug: string;
  form_data: Record<string, any>;
  description?: string;
}

export const CreatePlaceForm: React.FC<CreatePlaceFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [mapPosition, setMapPosition] = useState<[number, number]>([55.7558, 37.6173]);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [addressInput, setAddressInput] = useState<string>('');
  
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm();

  // TODO: Загрузить список категорий при монтировании
  useEffect(() => {
    // TODO: GET /api/maps/categories/
    // TODO: Сохранить в state
  }, []);

  // TODO: Загрузить схему формы при выборе категории
  useEffect(() => {
    if (selectedCategory) {
      // TODO: GET /api/maps/categories/{slug}/schema/
      // TODO: Сохранить в state
    }
  }, [selectedCategory]);

  // TODO: Реализовать геокодирование адреса
  const handleAddressGeocode = async () => {
    // TODO: POST /api/maps/geocode/ с адресом
    // TODO: Установить координаты на карте
  };

  // TODO: Реализовать обратное геокодирование (при клике на карту)
  const handleMapClick = async (lat: number, lng: number) => {
    // TODO: POST /api/maps/reverse-geocode/ с координатами
    // TODO: Установить адрес в поле
    setMarkerPosition([lat, lng]);
  };

  // TODO: Рендерить поля формы динамически на основе formSchema
  const renderFormFields = () => {
    if (!formSchema) return null;

    return formSchema.fields.map((field) => {
      switch (field.type) {
        case 'boolean':
          // TODO: Рендерить checkbox
          break;
        case 'range':
          // TODO: Рендерить range input
          break;
        case 'select':
          // TODO: Рендерить select
          break;
        case 'text':
          // TODO: Рендерить text input
          break;
        case 'photo':
          // TODO: Рендерить file upload
          break;
      }
    });
  };

  const onSubmitForm = async (data: any) => {
    // TODO: Собрать form_data из полей формы
    // TODO: Валидировать обязательные поля
    // TODO: Вызвать onSubmit с данными
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)}>
      {/* TODO: Поле для ввода адреса */}
      <div>
        <label>Адрес</label>
        <input
          type="text"
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          placeholder="Введите адрес или выберите на карте"
        />
        <button type="button" onClick={handleAddressGeocode}>
          Найти на карте
        </button>
      </div>

      {/* TODO: Карта для выбора координат */}
      <div style={{ height: '400px', margin: '20px 0' }}>
        <MapContainer
          center={mapPosition}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <MapClickHandler onMapClick={handleMapClick} />
          {markerPosition && <Marker position={markerPosition} />}
        </MapContainer>
      </div>

      {/* TODO: Выбор категории */}
      <div>
        <label>Категория</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Выберите категорию</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* TODO: Динамические поля формы */}
      {formSchema && (
        <div>
          <h3>Заполните данные</h3>
          {renderFormFields()}
        </div>
      )}

      {/* TODO: Кнопки отправки и отмены */}
      <div>
        <button type="submit">Отправить на модерацию</button>
        <button type="button" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
};

// TODO: Компонент для обработки кликов на карте
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};
```

### Задача 1.2: Создать страницу создания места

**Файл:** `frontend/src/pages/CreatePlace.tsx`

```typescript
/**
 * TODO: Создать страницу для создания места
 */

import React from 'react';
import { CreatePlaceForm } from '../components/places/CreatePlaceForm';
import { useNavigate } from 'react-router-dom';
import { createPlaceSubmission } from '../api/places';

export const CreatePlacePage: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = async (data: PlaceSubmissionData) => {
    try {
      // TODO: POST /api/maps/pois/submit/
      await createPlaceSubmission(data);
      // TODO: Показать уведомление об успехе
      navigate('/places/my-submissions');
    } catch (error) {
      // TODO: Показать ошибку
    }
  };

  return (
    <div>
      <h1>Создать место</h1>
      <CreatePlaceForm
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
};
```

### Задача 1.3: Создать API функции

**Файл:** `frontend/src/api/places.ts`

```typescript
/**
 * TODO: Создать API функции для работы с местами
 */

import api from './index';

export interface Category {
  uuid: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  marker_color: string;
}

export interface FormSchema {
  uuid: string;
  category: string;
  name: string;
  schema_json: {
    fields: FormField[];
    version: string;
  };
}

export interface FormField {
  id: string;
  type: 'boolean' | 'range' | 'select' | 'text' | 'photo';
  label: string;
  direction: 1 | -1;
  weight: number;
  required?: boolean;
  scale_min?: number;
  scale_max?: number;
  mapping?: Record<string, number>;
  options?: string[];
}

export interface PlaceSubmissionData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category_slug: string;
  form_data: Record<string, any>;
  description?: string;
}

// TODO: Получить список категорий
export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get('/maps/categories/');
  return response.data;
};

// TODO: Получить схему формы для категории
export const getCategorySchema = async (categorySlug: string): Promise<FormSchema> => {
  const response = await api.get(`/maps/categories/${categorySlug}/schema/`);
  return response.data;
};

// TODO: Создать заявку на место
export const createPlaceSubmission = async (data: PlaceSubmissionData): Promise<any> => {
  const response = await api.post('/maps/pois/submit/', data);
  return response.data;
};

// TODO: Получить список заявок пользователя
export const getMySubmissions = async (): Promise<any[]> => {
  const response = await api.get('/maps/pois/submissions/');
  return response.data;
};

// TODO: Получить детали заявки
export const getSubmissionDetails = async (id: string): Promise<any> => {
  const response = await api.get(`/maps/pois/submissions/${id}/`);
  return response.data;
};

// TODO: Геокодирование адреса
export const geocodeAddress = async (address: string): Promise<any> => {
  const response = await api.post('/maps/geocode/', { address });
  return response.data;
};

// TODO: Обратное геокодирование
export const reverseGeocode = async (lat: number, lng: number): Promise<any> => {
  const response = await api.post('/maps/reverse-geocode/', { latitude: lat, longitude: lng });
  return response.data;
};
```

---

## 🎯 ЭТАП 2: Страница моих заявок

### Задача 2.1: Создать компонент списка заявок

**Файл:** `frontend/src/components/places/MySubmissionsList.tsx`

```typescript
/**
 * TODO: Создать компонент для отображения списка заявок пользователя
 */

import React from 'react';
import { Link } from 'react-router-dom';

interface Submission {
  id: string;
  name: string;
  address: string;
  category: string;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  llm_verdict?: {
    verdict: string;
    comment: string;
    confidence: number;
  };
  created_at: string;
}

export const MySubmissionsList: React.FC<{ submissions: Submission[] }> = ({ submissions }) => {
  const getStatusBadge = (status: string) => {
    // TODO: Вернуть badge с цветом в зависимости от статуса
    const colors = {
      pending: 'yellow',
      approved: 'green',
      rejected: 'red',
      changes_requested: 'orange',
    };
    return <span style={{ color: colors[status] }}>{status}</span>;
  };

  return (
    <div>
      <h2>Мои заявки</h2>
      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>Адрес</th>
            <th>Категория</th>
            <th>Статус</th>
            <th>Вердикт LLM</th>
            <th>Дата создания</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => (
            <tr key={submission.id}>
              <td>{submission.name}</td>
              <td>{submission.address}</td>
              <td>{submission.category}</td>
              <td>{getStatusBadge(submission.moderation_status)}</td>
              <td>
                {submission.llm_verdict && (
                  <div>
                    <span>{submission.llm_verdict.verdict}</span>
                    <span>({Math.round(submission.llm_verdict.confidence * 100)}%)</span>
                    <p>{submission.llm_verdict.comment}</p>
                  </div>
                )}
              </td>
              <td>{new Date(submission.created_at).toLocaleDateString()}</td>
              <td>
                <Link to={`/places/submissions/${submission.id}`}>Детали</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### Задача 2.2: Создать страницу моих заявок

**Файл:** `frontend/src/pages/MySubmissions.tsx`

```typescript
/**
 * TODO: Создать страницу для просмотра заявок пользователя
 */

import React, { useEffect, useState } from 'react';
import { MySubmissionsList } from '../components/places/MySubmissionsList';
import { getMySubmissions } from '../api/places';

export const MySubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Загрузить заявки при монтировании
    const loadSubmissions = async () => {
      try {
        const data = await getMySubmissions();
        setSubmissions(data);
      } catch (error) {
        // TODO: Обработать ошибку
      } finally {
        setLoading(false);
      }
    };
    loadSubmissions();
  }, []);

  if (loading) return <div>Загрузка...</div>;

  return (
    <div>
      <h1>Мои заявки</h1>
      <MySubmissionsList submissions={submissions} />
    </div>
  );
};
```

---

## 🎯 ЭТАП 3: Модерация заявок (для модераторов)

### Задача 3.1: Создать компонент модерации

**Файл:** `frontend/src/components/places/ModerationPanel.tsx`

```typescript
/**
 * TODO: Создать компонент для модерации заявок
 * Доступен только модераторам
 */

import React, { useState } from 'react';

interface Submission {
  id: string;
  name: string;
  address: string;
  category: string;
  form_data: Record<string, any>;
  llm_verdict?: {
    verdict: string;
    comment: string;
    confidence: number;
    analysis: {
      field_quality: string;
      health_impact: string;
      data_completeness: number;
    };
  };
  submitted_by: {
    username: string;
    email: string;
  };
}

interface ModerationPanelProps {
  submission: Submission;
  onModerate: (action: string, comment: string) => Promise<void>;
}

export const ModerationPanel: React.FC<ModerationPanelProps> = ({
  submission,
  onModerate,
}) => {
  const [action, setAction] = useState<'approve' | 'reject' | 'request_changes'>('approve');
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    // TODO: Вызвать onModerate с действием и комментарием
    await onModerate(action, comment);
  };

  return (
    <div>
      <h2>Модерация заявки</h2>
      
      {/* TODO: Отобразить данные заявки */}
      <div>
        <h3>{submission.name}</h3>
        <p>Адрес: {submission.address}</p>
        <p>Категория: {submission.category}</p>
        <p>Создал: {submission.submitted_by.username}</p>
      </div>

      {/* TODO: Отобразить вердикт LLM */}
      {submission.llm_verdict && (
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '10px', 
          margin: '10px 0',
          backgroundColor: submission.llm_verdict.verdict === 'approve' ? '#d4edda' : '#f8d7da'
        }}>
          <h4>Вердикт LLM</h4>
          <p><strong>Решение:</strong> {submission.llm_verdict.verdict}</p>
          <p><strong>Уверенность:</strong> {Math.round(submission.llm_verdict.confidence * 100)}%</p>
          <p><strong>Комментарий:</strong> {submission.llm_verdict.comment}</p>
          {submission.llm_verdict.analysis && (
            <div>
              <p>Качество полей: {submission.llm_verdict.analysis.field_quality}</p>
              <p>Влияние на здоровье: {submission.llm_verdict.analysis.health_impact}</p>
              <p>Полнота данных: {Math.round(submission.llm_verdict.analysis.data_completeness * 100)}%</p>
            </div>
          )}
        </div>
      )}

      {/* TODO: Отобразить заполненные поля формы */}
      <div>
        <h4>Заполненные данные</h4>
        {Object.entries(submission.form_data).map(([key, value]) => (
          <div key={key}>
            <strong>{key}:</strong> {String(value)}
          </div>
        ))}
      </div>

      {/* TODO: Форма модерации */}
      <div>
        <h4>Решение модератора</h4>
        <select value={action} onChange={(e) => setAction(e.target.value as any)}>
          <option value="approve">Одобрить</option>
          <option value="reject">Отклонить</option>
          <option value="request_changes">Запросить изменения</option>
        </select>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Комментарий модератора"
          rows={4}
        />
        <button onClick={handleSubmit}>Применить</button>
      </div>
    </div>
  );
};
```

### Задача 3.2: Создать страницу модерации

**Файл:** `frontend/src/pages/ModerationPage.tsx`

```typescript
/**
 * TODO: Создать страницу для модерации заявок
 * Доступна только модераторам
 */

import React, { useEffect, useState } from 'react';
import { ModerationPanel } from '../components/places/ModerationPanel';
import { getPendingSubmissions, moderateSubmission } from '../api/places';
import { useAuth } from '../context/AuthContext';

export const ModerationPage: React.FC = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // TODO: Проверить права модератора
  useEffect(() => {
    if (!user?.is_staff) {
      // TODO: Редирект на главную
    }
  }, [user]);

  useEffect(() => {
    // TODO: Загрузить список заявок на модерацию
    const loadSubmissions = async () => {
      try {
        const data = await getPendingSubmissions();
        setSubmissions(data);
      } catch (error) {
        // TODO: Обработать ошибку
      }
    };
    loadSubmissions();
  }, []);

  const handleModerate = async (submissionId: string, action: string, comment: string) => {
    try {
      // TODO: POST /api/maps/pois/submissions/{id}/moderate/
      await moderateSubmission(submissionId, action, comment);
      // TODO: Обновить список заявок
      // TODO: Показать уведомление об успехе
    } catch (error) {
      // TODO: Показать ошибку
    }
  };

  return (
    <div>
      <h1>Модерация заявок</h1>
      <div style={{ display: 'flex' }}>
        {/* TODO: Список заявок слева */}
        <div style={{ width: '30%' }}>
          <h2>Заявки на модерацию</h2>
          {submissions.map((submission) => (
            <div
              key={submission.id}
              onClick={() => setSelectedSubmission(submission)}
              style={{
                padding: '10px',
                border: '1px solid #ccc',
                margin: '5px 0',
                cursor: 'pointer',
              }}
            >
              <strong>{submission.name}</strong>
              <p>{submission.address}</p>
              <p>Категория: {submission.category}</p>
            </div>
          ))}
        </div>

        {/* TODO: Панель модерации справа */}
        <div style={{ width: '70%', padding: '20px' }}>
          {selectedSubmission ? (
            <ModerationPanel
              submission={selectedSubmission}
              onModerate={(action, comment) =>
                handleModerate(selectedSubmission.id, action, comment)
              }
            />
          ) : (
            <p>Выберите заявку для модерации</p>
          )}
        </div>
      </div>
    </div>
  );
};
```

### Задача 3.3: Добавить API функции для модерации

**Файл:** `frontend/src/api/places.ts`

```typescript
// TODO: Добавить функции для модерации

// Получить список заявок на модерацию
export const getPendingSubmissions = async (): Promise<any[]> => {
  const response = await api.get('/maps/pois/submissions/pending/');
  return response.data;
};

// Модерировать заявку
export const moderateSubmission = async (
  submissionId: string,
  action: 'approve' | 'reject' | 'request_changes',
  comment: string
): Promise<any> => {
  const response = await api.post(`/maps/pois/submissions/${submissionId}/moderate/`, {
    action,
    comment,
  });
  return response.data;
};
```

---

## 🎯 ЭТАП 4: Массовая загрузка датасета (для модераторов)

### Задача 4.1: Создать компонент загрузки Excel

**Файл:** `frontend/src/components/places/BulkUploadForm.tsx`

```typescript
/**
 * TODO: Создать компонент для массовой загрузки Excel файла
 * Доступен только модераторам
 */

import React, { useState } from 'react';
import { bulkUploadPlaces } from '../api/places';

export const BulkUploadForm: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [autoCreateCategories, setAutoCreateCategories] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      // TODO: POST /api/maps/pois/bulk-upload/
      const result = await bulkUploadPlaces(file, autoCreateCategories);
      setResult(result);
      // TODO: Показать уведомление об успехе
    } catch (error) {
      // TODO: Показать ошибку
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Массовая загрузка мест</h2>
      
      {/* TODO: Выбор файла */}
      <div>
        <label>Excel файл</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          required
        />
      </div>

      {/* TODO: Опция автоматического создания категорий */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={autoCreateCategories}
            onChange={(e) => setAutoCreateCategories(e.target.checked)}
          />
          Автоматически создавать категории
        </label>
      </div>

      {/* TODO: Кнопка загрузки */}
      <button type="submit" disabled={!file || uploading}>
        {uploading ? 'Загрузка...' : 'Загрузить'}
      </button>

      {/* TODO: Отобразить результат загрузки */}
      {result && (
        <div>
          <h3>Результаты загрузки</h3>
          <p>Всего: {result.total}</p>
          <p>Создано: {result.created}</p>
          <p>Ошибок: {result.errors}</p>
          {result.errors_details && result.errors_details.length > 0 && (
            <div>
              <h4>Ошибки:</h4>
              <ul>
                {result.errors_details.map((error: any, index: number) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </div>
          )}
          {result.categories_created && result.categories_created.length > 0 && (
            <div>
              <h4>Созданные категории:</h4>
              <ul>
                {result.categories_created.map((cat: string) => (
                  <li key={cat}>{cat}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </form>
  );
};
```

### Задача 4.2: Создать страницу массовой загрузки

**Файл:** `frontend/src/pages/BulkUploadPage.tsx`

```typescript
/**
 * TODO: Создать страницу для массовой загрузки
 */

import React from 'react';
import { BulkUploadForm } from '../components/places/BulkUploadForm';
import { useAuth } from '../context/AuthContext';

export const BulkUploadPage: React.FC = () => {
  const { user } = useAuth();

  // TODO: Проверить права модератора
  if (!user?.is_staff) {
    return <div>Доступ запрещен</div>;
  }

  return (
    <div>
      <h1>Массовая загрузка мест</h1>
      <BulkUploadForm />
    </div>
  );
};
```

### Задача 4.3: Добавить API функцию для загрузки

**Файл:** `frontend/src/api/places.ts`

```typescript
// TODO: Добавить функцию для массовой загрузки

export const bulkUploadPlaces = async (
  file: File,
  autoCreateCategories: boolean = false
): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('auto_create_categories', String(autoCreateCategories));

  const response = await api.post('/maps/pois/bulk-upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
```

---

## 🎯 ЭТАП 5: Редактор категорий (для модераторов)

### Задача 5.1: Создать компонент редактора категорий

**Файл:** `frontend/src/components/places/CategoryEditor.tsx`

```typescript
/**
 * TODO: Создать компонент для редактирования категорий и их схем
 */

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';

interface CategoryEditorProps {
  category?: Category;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

export const CategoryEditor: React.FC<CategoryEditorProps> = ({
  category,
  onSave,
  onCancel,
}) => {
  const { register, handleSubmit, control, watch } = useForm({
    defaultValues: category || {
      name: '',
      slug: '',
      description: '',
      marker_color: '#FF0000',
      schema_json: {
        fields: [],
        version: '1.0',
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'schema_json.fields',
  });

  // TODO: Рендерить форму редактирования категории
  // TODO: Рендерить редактор полей схемы
  // TODO: Добавить/удалить поле
  // TODO: Редактировать поле (тип, label, weight, direction и т.д.)

  const onSubmit = async (data: any) => {
    // TODO: Валидировать данные
    // TODO: Вызвать onSave
    await onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* TODO: Поля категории */}
      <div>
        <label>Название</label>
        <input {...register('name')} />
      </div>

      <div>
        <label>Slug</label>
        <input {...register('slug')} />
      </div>

      <div>
        <label>Описание</label>
        <textarea {...register('description')} />
      </div>

      <div>
        <label>Цвет маркера</label>
        <input type="color" {...register('marker_color')} />
      </div>

      {/* TODO: Редактор полей схемы */}
      <div>
        <h3>Поля формы</h3>
        {fields.map((field, index) => (
          <div key={field.id}>
            {/* TODO: Поля для редактирования field */}
            <input {...register(`schema_json.fields.${index}.id`)} placeholder="ID поля" />
            <select {...register(`schema_json.fields.${index}.type`)}>
              <option value="boolean">Boolean</option>
              <option value="range">Range</option>
              <option value="select">Select</option>
              <option value="text">Text</option>
              <option value="photo">Photo</option>
            </select>
            <input {...register(`schema_json.fields.${index}.label`)} placeholder="Название" />
            <input type="number" {...register(`schema_json.fields.${index}.weight`)} placeholder="Вес" />
            <select {...register(`schema_json.fields.${index}.direction`)}>
              <option value={1}>Положительное влияние</option>
              <option value={-1}>Отрицательное влияние</option>
            </select>
            <button type="button" onClick={() => remove(index)}>Удалить</button>
          </div>
        ))}
        <button type="button" onClick={() => append({})}>Добавить поле</button>
      </div>

      <div>
        <button type="submit">Сохранить</button>
        <button type="button" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
};
```

### Задача 5.2: Создать страницу управления категориями

**Файл:** `frontend/src/pages/CategoriesManagementPage.tsx`

```typescript
/**
 * TODO: Создать страницу для управления категориями
 */

import React, { useState, useEffect } from 'react';
import { CategoryEditor } from '../components/places/CategoryEditor';
import { getCategories, createCategory, updateCategory, getCategorySchema, updateCategorySchema } from '../api/places';

export const CategoriesManagementPage: React.FC = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    // TODO: Загрузить список категорий
    const loadCategories = async () => {
      const data = await getCategories();
      setCategories(data);
    };
    loadCategories();
  }, []);

  const handleSave = async (data: any) => {
    try {
      if (selectedCategory) {
        // TODO: Обновить категорию
        await updateCategory(selectedCategory.slug, data);
      } else {
        // TODO: Создать категорию
        await createCategory(data);
      }
      // TODO: Обновить список
      setEditing(false);
    } catch (error) {
      // TODO: Показать ошибку
    }
  };

  return (
    <div>
      <h1>Управление категориями</h1>
      <div style={{ display: 'flex' }}>
        {/* TODO: Список категорий */}
        <div style={{ width: '30%' }}>
          <button onClick={() => { setSelectedCategory(null); setEditing(true); }}>
            Создать категорию
          </button>
          {categories.map((cat) => (
            <div
              key={cat.slug}
              onClick={() => { setSelectedCategory(cat); setEditing(true); }}
            >
              {cat.name}
            </div>
          ))}
        </div>

        {/* TODO: Редактор */}
        <div style={{ width: '70%' }}>
          {editing && (
            <CategoryEditor
              category={selectedCategory}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
```

### Задача 5.3: Добавить API функции для категорий

**Файл:** `frontend/src/api/places.ts`

```typescript
// TODO: Добавить функции для управления категориями

// Создать категорию
export const createCategory = async (data: any): Promise<Category> => {
  const response = await api.post('/maps/categories/', data);
  return response.data;
};

// Обновить категорию
export const updateCategory = async (slug: string, data: any): Promise<Category> => {
  const response = await api.put(`/maps/categories/${slug}/`, data);
  return response.data;
};

// Получить схему категории
export const getCategorySchema = async (categorySlug: string): Promise<FormSchema> => {
  const response = await api.get(`/maps/categories/${categorySlug}/schema/`);
  return response.data;
};

// Обновить схему категории
export const updateCategorySchema = async (categorySlug: string, schema: FormSchema): Promise<FormSchema> => {
  const response = await api.put(`/maps/categories/${categorySlug}/schema/`, schema);
  return response.data;
};
```

---

## 📝 Дополнительные задачи

### Задача: Добавить маршруты

**Файл:** `frontend/src/App.tsx` или роутер

```typescript
// TODO: Добавить маршруты:
// - /places/create - создание места
// - /places/my-submissions - мои заявки
// - /places/moderation - модерация (только для модераторов)
// - /places/bulk-upload - массовая загрузка (только для модераторов)
// - /places/categories - управление категориями (только для модераторов)
```

### Задача: Добавить навигацию

**Файл:** `frontend/src/components/layout/Navigation.tsx`

```typescript
// TODO: Добавить пункты меню:
// - "Создать место" (для всех авторизованных)
// - "Мои заявки" (для всех авторизованных)
// - "Модерация" (только для модераторов)
// - "Массовая загрузка" (только для модераторов)
// - "Управление категориями" (только для модераторов)
```

---

## ✅ Чек-лист реализации

### Этап 1: Ручное создание
- [ ] Создан компонент CreatePlaceForm
- [ ] Создана страница CreatePlacePage
- [ ] Добавлены API функции
- [ ] Интегрирована карта для выбора координат
- [ ] Реализовано динамическое отображение полей формы
- [ ] Протестировано создание заявки

### Этап 2: Мои заявки
- [ ] Создан компонент MySubmissionsList
- [ ] Создана страница MySubmissionsPage
- [ ] Протестирован просмотр заявок

### Этап 3: Модерация
- [ ] Создан компонент ModerationPanel
- [ ] Создана страница ModerationPage
- [ ] Добавлены API функции для модерации
- [ ] Реализовано отображение вердикта LLM
- [ ] Протестирована модерация

### Этап 4: Массовая загрузка
- [ ] Создан компонент BulkUploadForm
- [ ] Создана страница BulkUploadPage
- [ ] Добавлена API функция для загрузки
- [ ] Протестирована загрузка Excel

### Этап 5: Редактор категорий
- [ ] Создан компонент CategoryEditor
- [ ] Создана страница CategoriesManagementPage
- [ ] Добавлены API функции для категорий
- [ ] Протестировано создание/редактирование категорий

---

## 🔗 Связанные файлы

- `ARCHITECTURE_PLACES_SYSTEM.md` - архитектурный план
- `BACKEND_TASK_PLACES.md` - ТЗ для бэкендера
- `frontend/src/api/places.ts` - API функции
- `frontend/src/components/places/` - компоненты
