/**
 * Компонент для редактирования категорий и их схем
 * Этап 5: Редактор категорий (для модераторов)
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../auth/Input';
import { Select } from '../common/Select';
import { POICategory, FormSchema, FormField } from '../../api/maps';
import { theme } from '../../theme';

interface CategoryEditorProps {
  category?: POICategory | null;
  formSchema?: FormSchema | null;
  onSave: (categoryData: Partial<POICategory>, schemaData?: Partial<FormSchema>) => Promise<void>;
  onCancel: () => void;
}

const EditorContainer = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  max-width: 1000px;
  margin: 0 auto;
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding-bottom: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.main};
`;

const EditorTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.main};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
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
`;

const ColorInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ColorInput = styled.input`
  width: 80px;
  height: 50px;
  border: 2px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  background: none;
`;

const ColorPreview = styled.div<{ $color: string }>`
  width: 50px;
  height: 50px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ $color }) => $color};
  border: 2px solid ${({ theme }) => theme.colors.border.main};
`;

const FieldsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const FieldCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.main};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
`;

const FieldHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const FieldTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const OptionsInput = styled(TextArea)`
  min-height: 60px;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const OptionsHint = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 2px solid ${({ theme }) => theme.colors.border.main};
`;

const ErrorMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.error};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.accent.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const EmptyFieldsCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const CategoryEditor: React.FC<CategoryEditorProps> = ({
  category,
  formSchema,
  onSave,
  onCancel,
}) => {
  const [categoryData, setCategoryData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: (category as any)?.description || '',
    marker_color: category?.marker_color || '#FF0000',
    health_weight: category?.health_weight || 1.0,
    health_importance: category?.health_importance || 1.0,
    display_order: category?.display_order || 0,
    is_active: category?.is_active ?? true,
  });

  const [fields, setFields] = useState<FormField[]>(
    formSchema?.schema_json.fields || []
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Обновление данных при изменении category или formSchema
  useEffect(() => {
    if (category) {
      setCategoryData({
        name: category.name || '',
        slug: category.slug || '',
        description: (category as any)?.description || '',
        marker_color: category.marker_color || '#FF0000',
        health_weight: category.health_weight || 1.0,
        health_importance: category.health_importance || 1.0,
        display_order: category.display_order || 0,
        is_active: category.is_active ?? true,
      });
    }
  }, [category]);

  useEffect(() => {
    if (formSchema) {
      setFields(formSchema.schema_json.fields || []);
    }
  }, [formSchema]);

  const handleCategoryChange = (field: string, value: any) => {
    setCategoryData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFieldChange = (index: number, field: keyof FormField, value: any) => {
    setFields((prev) => {
      const newFields = [...prev];
      newFields[index] = {
        ...newFields[index],
        [field]: value,
      };
      return newFields;
    });
  };

  const handleAddField = () => {
    setFields((prev) => [
      ...prev,
      {
        id: `field_${Date.now()}`,
        type: 'text',
        label: '',
        direction: 1,
        weight: 1.0,
        required: false,
      },
    ]);
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionsChange = (index: number, value: string) => {
    const options = value
      .split(',')
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);
    handleFieldChange(index, 'options', options);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация
    if (!categoryData.name.trim()) {
      setError('Введите название категории');
      return;
    }

    if (!categoryData.slug.trim()) {
      setError('Введите slug категории');
      return;
    }

    // Валидация полей схемы
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (!field.id || !field.label) {
        setError(`Заполните ID и название для поля ${i + 1}`);
        return;
      }
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        setError(`Добавьте опции для поля "${field.label}"`);
        return;
      }
      if (field.type === 'range' && (field.scale_min === undefined || field.scale_max === undefined)) {
        setError(`Укажите min и max для поля "${field.label}"`);
        return;
      }
    }

    setSaving(true);
    try {
      const schemaData: Partial<FormSchema> = {
        schema_json: {
          fields: fields,
          version: formSchema?.version || '1.0',
        },
      };

      await onSave(categoryData, schemaData);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Не удалось сохранить категорию'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditorContainer>
      <EditorHeader>
        <EditorTitle>
          {category ? 'Редактировать категорию' : 'Создать категорию'}
        </EditorTitle>
      </EditorHeader>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Form onSubmit={handleSubmit}>
        {/* Основные поля категории */}
        <Section>
          <SectionTitle>Основная информация</SectionTitle>
          <Input
            label="Название категории *"
            value={categoryData.name}
            onChange={(e) => handleCategoryChange('name', e.target.value)}
            placeholder="Например: Аптека"
            required
          />
          <Input
            label="Slug *"
            value={categoryData.slug}
            onChange={(e) => handleCategoryChange('slug', e.target.value)}
            placeholder="Например: pharmacy"
            required
            disabled={!!category} // Slug нельзя менять для существующих категорий
          />
          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.xs,
              }}
            >
              Описание
            </label>
            <TextArea
              value={categoryData.description}
              onChange={(e) => handleCategoryChange('description', e.target.value)}
              placeholder="Описание категории"
            />
          </div>
          <FormRow>
            <ColorInputWrapper>
              <label
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text.secondary,
                }}
              >
                Цвет маркера:
              </label>
              <ColorInput
                type="color"
                value={categoryData.marker_color}
                onChange={(e) => handleCategoryChange('marker_color', e.target.value)}
              />
              <ColorPreview $color={categoryData.marker_color} />
            </ColorInputWrapper>
            <Input
              label="Порядок отображения"
              type="number"
              value={categoryData.display_order.toString()}
              onChange={(e) => handleCategoryChange('display_order', parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </FormRow>
          <FormRow>
            <Input
              label="Вес здоровья"
              type="number"
              step="0.1"
              value={categoryData.health_weight.toString()}
              onChange={(e) => handleCategoryChange('health_weight', parseFloat(e.target.value) || 1.0)}
              placeholder="1.0"
            />
            <Input
              label="Важность здоровья"
              type="number"
              step="0.1"
              value={categoryData.health_importance.toString()}
              onChange={(e) => handleCategoryChange('health_importance', parseFloat(e.target.value) || 1.0)}
              placeholder="1.0"
            />
          </FormRow>
        </Section>

        {/* Поля схемы формы */}
        <Section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
            <SectionTitle>Поля формы</SectionTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddField}>
              ➕ Добавить поле
            </Button>
          </div>

          {fields.length === 0 ? (
            <EmptyFieldsCard>
              Нет полей. Добавьте первое поле формы.
            </EmptyFieldsCard>
          ) : (
            <FieldsList>
              {fields.map((field, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FieldCard>
                    <FieldHeader>
                      <FieldTitle>Поле {index + 1}</FieldTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(index)}
                      >
                        🗑️ Удалить
                      </Button>
                    </FieldHeader>
                    <FieldGrid>
                      <Input
                        label="ID поля *"
                        value={field.id}
                        onChange={(e) => handleFieldChange(index, 'id', e.target.value)}
                        placeholder="field_id"
                        required
                      />
                      <Input
                        label="Название *"
                        value={field.label}
                        onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                        placeholder="Название поля"
                        required
                      />
                      <Select
                        label="Тип поля *"
                        value={field.type}
                        onChange={(value) => handleFieldChange(index, 'type', value)}
                        options={[
                          { value: 'text', label: 'Текст' },
                          { value: 'boolean', label: 'Да/Нет' },
                          { value: 'range', label: 'Диапазон' },
                          { value: 'select', label: 'Выбор' },
                          { value: 'photo', label: 'Фото' },
                        ]}
                        required
                      />
                      <Select
                        label="Влияние *"
                        value={field.direction.toString()}
                        onChange={(value) => handleFieldChange(index, 'direction', parseInt(value))}
                        options={[
                          { value: '1', label: '✅ Положительное' },
                          { value: '-1', label: '❌ Отрицательное' },
                        ]}
                        required
                      />
                      <Input
                        label="Вес *"
                        type="number"
                        step="0.1"
                        value={field.weight.toString()}
                        onChange={(e) => handleFieldChange(index, 'weight', parseFloat(e.target.value) || 1.0)}
                        placeholder="1.0"
                        required
                      />
                      <div>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.sm,
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.medium,
                            color: theme.colors.text.secondary,
                            marginBottom: theme.spacing.xs,
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={field.required || false}
                            onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                          />
                          Обязательное поле
                        </label>
                      </div>
                    </FieldGrid>

                    {field.type === 'range' && (
                      <FormRow style={{ marginTop: theme.spacing.md }}>
                        <Input
                          label="Минимум"
                          type="number"
                          value={field.scale_min?.toString() || '0'}
                          onChange={(e) => handleFieldChange(index, 'scale_min', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                        <Input
                          label="Максимум"
                          type="number"
                          value={field.scale_max?.toString() || '100'}
                          onChange={(e) => handleFieldChange(index, 'scale_max', parseFloat(e.target.value) || 100)}
                          placeholder="100"
                        />
                      </FormRow>
                    )}

                    {field.type === 'select' && (
                      <div style={{ marginTop: theme.spacing.md }}>
                        <label
                          style={{
                            display: 'block',
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.medium,
                            color: theme.colors.text.secondary,
                            marginBottom: theme.spacing.xs,
                          }}
                        >
                          Опции (через запятую) *
                        </label>
                        <OptionsInput
                          value={field.options?.join(', ') || ''}
                          onChange={(e) => handleOptionsChange(index, e.target.value)}
                          placeholder="Опция 1, Опция 2, Опция 3"
                        />
                        <OptionsHint>
                          Введите опции через запятую. Например: Да, Нет, Частично
                        </OptionsHint>
                      </div>
                    )}

                    {field.description !== undefined && (
                      <div style={{ marginTop: theme.spacing.md }}>
                        <Input
                          label="Описание поля"
                          value={field.description || ''}
                          onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                          placeholder="Описание поля (необязательно)"
                        />
                      </div>
                    )}
                  </FieldCard>
                </motion.div>
              ))}
            </FieldsList>
          )}
        </Section>

        <ButtonsRow>
          <Button variant="outline" onClick={onCancel} fullWidth disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" fullWidth disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить категорию'}
          </Button>
        </ButtonsRow>
      </Form>
    </EditorContainer>
  );
};

