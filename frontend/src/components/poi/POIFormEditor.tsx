import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../auth/Input';
import { Select } from '../common/Select';
import { theme } from '../../theme';
import { ratingsApi, FormSchema, FormField, POIDetails } from '../../api/maps';

interface POIFormEditorProps {
  poi: POIDetails;
  onSave?: (formData: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
}

const FormContainer = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const FormHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const FormTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const FormDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const FieldContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const FieldLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const FieldDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const DirectionIndicator = styled.span<{ direction: 1 | -1 }>`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme, direction }) =>
    direction === 1 ? theme.colors.accent.success : theme.colors.accent.error};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`;

const RangeInput = styled.input.attrs({ type: 'range' })`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.background.card};
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary.main};
    cursor: pointer;
    box-shadow: ${({ theme }) => theme.shadows.md};
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.1);
      box-shadow: ${({ theme }) => theme.shadows.lg};
    }
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary.main};
    cursor: pointer;
    border: none;
    box-shadow: ${({ theme }) => theme.shadows.md};
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.1);
      box-shadow: ${({ theme }) => theme.shadows.lg};
    }
  }
`;

const RangeValue = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.card};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary.main};
    background: ${({ theme }) => `${theme.colors.primary.main}10`};
  }
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.primary.main};
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const ErrorMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.error};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.accent.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const LoadingMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
`;

export const POIFormEditor: React.FC<POIFormEditorProps> = ({
  poi,
  onSave,
  onCancel,
}) => {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка схемы анкеты
  useEffect(() => {
    const loadSchema = async () => {
      try {
        setLoading(true);
        setError(null);

        // Если у POI есть form_schema, загружаем его
        if (poi.form_schema) {
          const loadedSchema = await ratingsApi.getFormSchema(poi.form_schema);
          setSchema(loadedSchema);
        } else {
          // Иначе пытаемся найти схему для категории
          const schemas = await ratingsApi.getFormSchemas({
            category: poi.category?.uuid || '',
          });
          
          // Берем первую одобренную схему
          const approvedSchema = schemas.results.find(
            (s) => s.status === 'approved'
          );
          
          if (approvedSchema) {
            setSchema(approvedSchema);
          } else if (schemas.results.length > 0) {
            // Если нет одобренных, берем первую
            setSchema(schemas.results[0]);
          }
        }

        // Загружаем существующие данные анкеты
        if (poi.form_data) {
          setFormData(poi.form_data);
        }
      } catch (err: any) {
        console.error('Ошибка загрузки схемы:', err);
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            'Не удалось загрузить схему анкеты'
        );
      } finally {
        setLoading(false);
      }
    };

    loadSchema();
  }, [poi]);

  // Обработка изменения значения поля
  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

  // Рендер поля формы
  const renderField = useCallback((field: FormField) => {
    const currentValue = formData[field.id];

    switch (field.type) {
      case 'boolean':
        return (
          <CheckboxWrapper>
            <Checkbox
              checked={currentValue === true}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
            />
            <span>{field.label}</span>
            {field.direction === 1 ? (
              <DirectionIndicator direction={1}>✓ Полезно</DirectionIndicator>
            ) : (
              <DirectionIndicator direction={-1}>✗ Вредно</DirectionIndicator>
            )}
          </CheckboxWrapper>
        );

      case 'range':
        const min = field.scale_min || 0;
        const max = field.scale_max || 10;
        const value = currentValue !== undefined ? currentValue : min;

        return (
          <div>
            <RangeInput
              min={min}
              max={max}
              step={1}
              value={value}
              onChange={(e) =>
                handleFieldChange(field.id, parseFloat(e.target.value))
              }
            />
            <RangeValue>
              <span>{min}</span>
              <span style={{ fontWeight: 'bold' }}>{value}</span>
              <span>{max}</span>
            </RangeValue>
          </div>
        );

      case 'select':
        return (
          <Select
            value={currentValue?.toString() || ''}
            onChange={(value) => handleFieldChange(field.id, value)}
            options={[
              { value: '', label: 'Выберите значение' },
              ...(field.options || []).map((opt) => ({
                value: opt,
                label: opt,
              })),
            ]}
            placeholder="Выберите значение"
          />
        );

      case 'photo':
        return (
          <div>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // В реальном приложении нужно загрузить файл и получить URL
                  // Здесь просто сохраняем имя файла
                  handleFieldChange(field.id, file.name);
                }
              }}
            />
            {currentValue && (
              <div style={{ marginTop: theme.spacing.xs, fontSize: theme.typography.fontSize.sm, color: theme.colors.text.muted }}>
                Выбран: {currentValue}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  }, [formData, handleFieldChange]);

  // Сохранение данных
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      if (onSave) {
        await onSave(formData);
      } else {
        // Сохраняем через API
        await ratingsApi.updatePOIFormData(poi.uuid, formData);
      }

      // Показываем сообщение об успехе
      alert('Анкета успешно сохранена!');
    } catch (err: any) {
      console.error('Ошибка сохранения анкеты:', err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Не удалось сохранить анкету'
      );
    } finally {
      setSaving(false);
    }
  }, [formData, poi.uuid, onSave]);

  if (loading) {
    return (
      <FormContainer>
        <LoadingMessage>Загрузка схемы анкеты...</LoadingMessage>
      </FormContainer>
    );
  }

  if (!schema) {
    return (
      <FormContainer>
        <ErrorMessage>
          Схема анкеты не найдена для данной категории. Обратитесь к администратору.
        </ErrorMessage>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} fullWidth>
            Закрыть
          </Button>
        )}
      </FormContainer>
    );
  }

  return (
    <FormContainer>
      <FormHeader>
        <FormTitle>Заполнение анкеты объекта</FormTitle>
      </FormHeader>

      <FormDescription>
        Заполните анкету для объекта "{poi.name}". Эти данные будут использованы
        для расчета рейтинга объекта.
      </FormDescription>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {schema.schema_json.fields.map((field) => (
        <FieldContainer key={field.id}>
          <FieldLabel>
            {field.label}
            {field.direction === 1 ? (
              <DirectionIndicator direction={1}>✓</DirectionIndicator>
            ) : (
              <DirectionIndicator direction={-1}>✗</DirectionIndicator>
            )}
          </FieldLabel>
          {field.description && (
            <FieldDescription>{field.description}</FieldDescription>
          )}
          {renderField(field)}
        </FieldContainer>
      ))}

      <ButtonsRow>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} fullWidth disabled={saving}>
            Отмена
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleSave}
          fullWidth
          disabled={saving}
        >
          {saving ? 'Сохранение...' : 'Сохранить анкету'}
        </Button>
      </ButtonsRow>
    </FormContainer>
  );
};

