/**
 * Компонент формы создания места
 * Этап 1: Ручное создание места пользователем
 * 
 * Компонент позволяет:
 * 1. Выбрать адрес или поставить метку на карте
 * 2. Выбрать категорию
 * 3. Динамически отобразить поля формы на основе выбранной категории
 * 4. Валидировать форму перед отправкой
 * 5. Отправить заявку на создание места
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../auth/Input';
import { Select } from '../common/Select';
import { theme } from '../../theme';
import { 
  getCategories, 
  getCategorySchema, 
  geocodeAddress, 
  reverseGeocode,
  PlaceSubmissionData,
  FormField 
} from '../../api/places';
import { POICategory } from '../../api/maps';
import { FormSchema } from '../../api/maps';

declare global {
  interface Window {
    ymaps: any;
  }
}

interface CreatePlaceFormProps {
  onSubmit: (data: PlaceSubmissionData) => Promise<void>;
  onCancel: () => void;
  initialCoordinates?: [number, number];
}

const FormContainer = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  max-width: 900px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const FormTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MapContainer = styled.div`
  height: 400px;
  width: 100%;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  margin: ${({ theme }) => theme.spacing.md} 0;
`;

const AddressRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: flex-end;
`;

const DynamicFieldsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
`;

const FieldLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  display: block;
`;

const FieldDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const RangeInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background.card};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
`;

const RangeValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.primary.main};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin-left: ${({ theme }) => theme.spacing.sm};
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-family: ${({ theme }) => theme.typography.fontFamily.main};
  min-height: 100px;
  resize: vertical;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
    box-shadow: ${({ theme }) => theme.shadows.glow};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const CheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.main};
  }
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.primary.main};
`;

const ErrorMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.error};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.accent.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const LoadingText = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

export const CreatePlaceForm: React.FC<CreatePlaceFormProps> = ({
  onSubmit,
  onCancel,
  initialCoordinates,
}) => {
  const [categories, setCategories] = useState<POICategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  // Форма данные
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(initialCoordinates?.[0] || null);
  const [longitude, setLongitude] = useState<number | null>(initialCoordinates?.[1] || null);
  const [description, setDescription] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [mapPosition, setMapPosition] = useState<[number, number]>(
    initialCoordinates || [55.7558, 37.6173]
  );

  // Загрузка категорий
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const cats = await getCategories();
        setCategories(cats.filter((cat) => cat.is_active));
      } catch (err: any) {
        console.error('Ошибка загрузки категорий:', err);
        setError('Не удалось загрузить категории');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Загрузка схемы формы при выборе категории
  useEffect(() => {
    const loadSchema = async () => {
      if (!selectedCategory) {
        setFormSchema(null);
        setFormData({});
        return;
      }

      try {
        setLoadingSchema(true);
        const schema = await getCategorySchema(selectedCategory);
        setFormSchema(schema);
        // Инициализируем formData пустыми значениями
        const initialFormData: Record<string, any> = {};
        schema.schema_json.fields.forEach((field) => {
          if (field.type === 'boolean') {
            initialFormData[field.id] = false;
          } else if (field.type === 'range') {
            initialFormData[field.id] = field.scale_min || 0;
          } else if (field.type === 'select') {
            initialFormData[field.id] = field.options?.[0] || '';
          } else {
            initialFormData[field.id] = '';
          }
        });
        setFormData(initialFormData);
      } catch (err: any) {
        console.error('Ошибка загрузки схемы:', err);
        setError('Не удалось загрузить схему формы для категории');
        setFormSchema(null);
      } finally {
        setLoadingSchema(false);
      }
    };

    loadSchema();
  }, [selectedCategory]);

  // Геокодирование адреса
  const handleAddressGeocode = async () => {
    if (!address.trim()) {
      setError('Введите адрес');
      return;
    }

    try {
      setGeocoding(true);
      setError(null);
      const result = await geocodeAddress(address);
      setLatitude(result.latitude);
      setLongitude(result.longitude);
      setMapPosition([result.latitude, result.longitude]);
      setAddress(result.formatted_address);
    } catch (err: any) {
      console.error('Ошибка геокодирования:', err);
      setError('Не удалось найти адрес на карте');
    } finally {
      setGeocoding(false);
    }
  };

  // Обратное геокодирование при клике на карту
  const handleMapClick = async (e: any) => {
    try {
      const coords = e.get('coords');
      if (coords && Array.isArray(coords) && coords.length === 2) {
        const lat = coords[0];
        const lon = coords[1];
        
        // Проверяем формат координат
        let finalLat: number;
        let finalLon: number;
        
        if (lat >= 50 && lat <= 60 && lon >= 30 && lon <= 40) {
          finalLat = lat;
          finalLon = lon;
        } else {
          finalLat = lon;
          finalLon = lat;
        }

        setLatitude(finalLat);
        setLongitude(finalLon);
        setMapPosition([finalLat, finalLon]);

        // Обратное геокодирование
        try {
          const result = await reverseGeocode(finalLat, finalLon);
          setAddress(result.formatted_address);
        } catch (err) {
          console.error('Ошибка обратного геокодирования:', err);
        }
      }
    } catch (err) {
      console.error('Ошибка обработки клика на карте:', err);
    }
  };

  // Обновление значений динамических полей
  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  // Рендеринг динамических полей формы
  const renderFormFields = () => {
    if (!formSchema) return null;

    return formSchema.schema_json.fields.map((field: FormField) => {
      switch (field.type) {
        case 'boolean':
          return (
            <CheckboxWrapper key={field.id}>
              <Checkbox
                type="checkbox"
                checked={formData[field.id] || false}
                onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              />
              <div>
                <FieldLabel>{field.label}</FieldLabel>
                {field.description && (
                  <FieldDescription>{field.description}</FieldDescription>
                )}
              </div>
            </CheckboxWrapper>
          );

        case 'range':
          return (
            <div key={field.id}>
              <FieldLabel>
                {field.label}
                {field.required && ' *'}
              </FieldLabel>
              {field.description && (
                <FieldDescription>{field.description}</FieldDescription>
              )}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <RangeInput
                  type="range"
                  min={field.scale_min || 0}
                  max={field.scale_max || 100}
                  value={formData[field.id] || field.scale_min || 0}
                  onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value))}
                />
                <RangeValue>{formData[field.id] || field.scale_min || 0}</RangeValue>
              </div>
            </div>
          );

        case 'select':
          return (
            <div key={field.id}>
              <FieldLabel>
                {field.label}
                {field.required && ' *'}
              </FieldLabel>
              {field.description && (
                <FieldDescription>{field.description}</FieldDescription>
              )}
              <Select
                value={formData[field.id] || ''}
                onChange={(value) => handleFieldChange(field.id, value)}
                options={[
                  { value: '', label: 'Выберите...' },
                  ...(field.options || []).map((opt) => ({
                    value: opt,
                    label: opt,
                  })),
                ]}
                placeholder="Выберите значение"
              />
            </div>
          );

        case 'text':
          return (
            <div key={field.id}>
              <Input
                label={field.label + (field.required ? ' *' : '')}
                value={formData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.description}
                required={field.required}
              />
            </div>
          );

        case 'photo':
          return (
            <div key={field.id}>
              <FieldLabel>
                {field.label}
                {field.required && ' *'}
              </FieldLabel>
              {field.description && (
                <FieldDescription>{field.description}</FieldDescription>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // В будущем можно добавить загрузку на сервер
                    handleFieldChange(field.id, file.name);
                  }
                }}
              />
            </div>
          );

        default:
          return null;
      }
    });
  };

  // Валидация и отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация
    if (!name.trim()) {
      setError('Введите название места');
      return;
    }

    if (!selectedCategory) {
      setError('Выберите категорию');
      return;
    }

    if (!address.trim()) {
      setError('Введите адрес или выберите на карте');
      return;
    }

    if (latitude === null || longitude === null) {
      setError('Выберите координаты на карте');
      return;
    }

    // Валидация обязательных полей формы
    if (formSchema) {
      const requiredFields = formSchema.schema_json.fields.filter((f) => f.required === true);
      for (const field of requiredFields) {
        const value = formData[field.id];
        if (value === undefined || value === null || value === '' || 
            (field.type === 'boolean' && value === false && field.required)) {
          setError(`Заполните обязательное поле: ${field.label}`);
          return;
        }
      }
    }

    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim(),
        latitude,
        longitude,
        category_slug: selectedCategory,
        form_data: formData,
        description: description.trim() || undefined,
      });
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Не удалось создать заявку'
      );
    }
  };

  return (
    <FormContainer>
      <FormTitle>Создать место</FormTitle>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Form onSubmit={handleSubmit}>
        {/* Название */}
        <Input
          label="Название места *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: Аптека №1"
          required
        />

        {/* Адрес */}
        <div>
          <FieldLabel>Адрес *</FieldLabel>
          <AddressRow>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Введите адрес или выберите на карте"
              fullWidth
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddressGeocode}
              disabled={geocoding}
            >
              {geocoding ? 'Поиск...' : 'Найти на карте'}
            </Button>
          </AddressRow>
        </div>

        {/* Карта */}
        <div>
          <FieldLabel>Выберите координаты на карте *</FieldLabel>
          <MapContainer>
            <YMaps
              query={{
                apikey: '5e4a4a8a-a758-45a6-a7c7-56ae3f6cbf63',
                lang: 'ru_RU',
              }}
            >
              <Map
                defaultState={{ center: mapPosition, zoom: 15 }}
                width="100%"
                height="100%"
                onClick={handleMapClick}
              >
                {latitude !== null && longitude !== null && (
                  <Placemark
                    geometry={[latitude, longitude]}
                    options={{
                      preset: 'islands#blueCircleDotIcon',
                      draggable: true,
                    }}
                    onDragEnd={(e: any) => {
                      const coords = e.get('target').geometry.getCoordinates();
                      setLatitude(coords[0]);
                      setLongitude(coords[1]);
                    }}
                  />
                )}
              </Map>
            </YMaps>
          </MapContainer>
        </div>

        {/* Координаты */}
        <FormRow>
          <Input
            label="Широта"
            type="number"
            step="any"
            value={latitude?.toString() || ''}
            onChange={(e) => setLatitude(parseFloat(e.target.value) || null)}
            placeholder="55.7558"
            readOnly
          />
          <Input
            label="Долгота"
            type="number"
            step="any"
            value={longitude?.toString() || ''}
            onChange={(e) => setLongitude(parseFloat(e.target.value) || null)}
            placeholder="37.6173"
            readOnly
          />
        </FormRow>

        {/* Категория */}
        <div>
          <Select
            label="Категория *"
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={[
              { value: '', label: 'Выберите категорию' },
              ...categories.map((cat) => ({
                value: cat.slug,
                label: cat.name,
              })),
            ]}
            placeholder="Выберите категорию"
            required
            error={loading ? 'Загрузка категорий...' : undefined}
          />
        </div>

        {/* Динамические поля формы */}
        {loadingSchema && <LoadingText>Загрузка формы...</LoadingText>}
        {formSchema && (
          <DynamicFieldsContainer>
            <h3 style={{ 
              fontSize: theme.typography.fontSize.lg,
              marginBottom: theme.spacing.md,
              color: theme.colors.text.primary
            }}>
              Заполните данные
            </h3>
            {renderFormFields()}
          </DynamicFieldsContainer>
        )}

        {/* Описание */}
        <div>
          <FieldLabel>Описание (необязательно)</FieldLabel>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Дополнительная информация о месте"
            rows={4}
          />
        </div>

        {/* Кнопки */}
        <ButtonsRow>
          <Button variant="outline" onClick={onCancel} fullWidth>
            Отмена
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={loading || loadingSchema}
          >
            Отправить на модерацию
          </Button>
        </ButtonsRow>
      </Form>
    </FormContainer>
  );
};

