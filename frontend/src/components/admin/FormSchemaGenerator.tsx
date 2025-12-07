import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../auth/Input';
import { Select } from '../common/Select';
import { theme } from '../../theme';
import { mapsApi, POICategory } from '../../api/maps';
import { ratingsApi, FormSchema, FormField } from '../../api/maps';

interface FormSchemaGeneratorProps {
  onSchemaCreated?: (schema: FormSchema) => void;
  onCancel?: () => void;
}

const GeneratorContainer = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const Section = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SectionTitle = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const FieldEditor = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
`;

const FieldHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const FieldTitle = styled.div`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const DeleteButton = styled(Button)`
  min-width: auto;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
`;

const FieldsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
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

const SuccessMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.success};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.accent.success};
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

export const FormSchemaGenerator: React.FC<FormSchemaGeneratorProps> = ({
  onSchemaCreated,
  onCancel,
}) => {
  const [categories, setCategories] = useState<POICategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoryDescription, setCategoryDescription] = useState('');
  const [generatedSchema, setGeneratedSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Загрузка категорий
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const cats = await mapsApi.getCategories();
        setCategories(cats);
      } catch (err: any) {
        console.error('Ошибка загрузки категорий:', err);
        setError('Не удалось загрузить категории');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Генерация схемы через LLM
  const handleGenerate = useCallback(async () => {
    if (!selectedCategoryId) {
      setError('Выберите категорию');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);

      const schema = await ratingsApi.generateFormSchema({
        category_id: selectedCategoryId,
        category_description: categoryDescription || undefined,
      });

      setGeneratedSchema(schema);
      setSuccess('Схема успешно сгенерирована! Вы можете отредактировать её перед сохранением.');
    } catch (err: any) {
      console.error('Ошибка генерации схемы:', err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Не удалось сгенерировать схему'
      );
    } finally {
      setGenerating(false);
    }
  }, [selectedCategoryId, categoryDescription]);

  // Удаление поля из схемы
  const handleRemoveField = useCallback((fieldId: string) => {
    if (!generatedSchema) return;

    const updatedFields = generatedSchema.schema_json.fields.filter(
      (f) => f.id !== fieldId
    );

    setGeneratedSchema({
      ...generatedSchema,
      schema_json: {
        ...generatedSchema.schema_json,
        fields: updatedFields,
      },
    });
  }, [generatedSchema]);

  // Обновление поля в схеме
  const handleUpdateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    if (!generatedSchema) return;

    const updatedFields = generatedSchema.schema_json.fields.map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f
    );

    setGeneratedSchema({
      ...generatedSchema,
      schema_json: {
        ...generatedSchema.schema_json,
        fields: updatedFields,
      },
    });
  }, [generatedSchema]);

  // Сохранение схемы
  const handleSave = useCallback(async () => {
    if (!generatedSchema) {
      setError('Нет схемы для сохранения');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);

      // В реальном приложении здесь должен быть API для сохранения/обновления схемы
      // Пока просто показываем сообщение
      setSuccess('Схема сохранена! (В реальном приложении здесь будет вызов API)');
      
      if (onSchemaCreated) {
        onSchemaCreated(generatedSchema);
      }
    } catch (err: any) {
      console.error('Ошибка сохранения схемы:', err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Не удалось сохранить схему'
      );
    } finally {
      setGenerating(false);
    }
  }, [generatedSchema, onSchemaCreated]);

  if (loading) {
    return (
      <GeneratorContainer>
        <LoadingMessage>Загрузка категорий...</LoadingMessage>
      </GeneratorContainer>
    );
  }

  return (
    <GeneratorContainer>
      <Header>
        <Title>Генерация схемы анкеты</Title>
      </Header>

      <Description>
        Выберите категорию и опишите её особенности. Система автоматически
        сгенерирует схему анкеты через LLM.
      </Description>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      <Section>
        <SectionTitle>Выбор категории</SectionTitle>
        <Select
          value={selectedCategoryId?.toString() || ''}
          onChange={async (value) => {
            if (!value) {
              setSelectedCategoryId(null);
              return;
            }
            
            // Находим категорию по UUID
            const category = categories.find((cat) => cat.uuid === value);
            if (category) {
              // Пытаемся найти схему для этой категории, чтобы получить category ID
              try {
                const schemas = await ratingsApi.getFormSchemas({
                  category: category.uuid,
                });
                
                // Если есть схемы, берем category ID из первой
                if (schemas.results.length > 0) {
                  setSelectedCategoryId(schemas.results[0].category);
                } else {
                  // Если схем нет, используем временное значение
                  // В реальном приложении нужно добавить поле id в POICategory
                  setError('Не удалось определить ID категории. Обратитесь к администратору.');
                  setSelectedCategoryId(null);
                }
              } catch (err) {
                console.error('Ошибка получения ID категории:', err);
                setError('Не удалось определить ID категории');
                setSelectedCategoryId(null);
              }
            }
          }}
          options={[
            { value: '', label: 'Выберите категорию' },
            ...categories.map((cat) => ({
              value: cat.uuid,
              label: cat.name,
            })),
          ]}
          placeholder="Выберите категорию"
        />
      </Section>

      <Section>
        <SectionTitle>Описание категории (опционально)</SectionTitle>
        <TextArea
          value={categoryDescription}
          onChange={(e) => setCategoryDescription(e.target.value)}
          placeholder="Опишите особенности категории для более точной генерации схемы..."
        />
      </Section>

      <Button
        variant="primary"
        onClick={handleGenerate}
        disabled={!selectedCategoryId || generating}
        fullWidth
      >
        {generating ? 'Генерация...' : '🤖 Сгенерировать схему через LLM'}
      </Button>

      {generatedSchema && (
        <Section>
          <SectionTitle>Сгенерированная схема</SectionTitle>
          <FieldsList>
            {generatedSchema.schema_json.fields.map((field) => (
              <FieldEditor key={field.id}>
                <FieldHeader>
                  <FieldTitle>{field.label}</FieldTitle>
                  <DeleteButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveField(field.id)}
                  >
                    Удалить
                  </DeleteButton>
                </FieldHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
                  <Input
                    label="Название поля"
                    value={field.label}
                    onChange={(e) =>
                      handleUpdateField(field.id, { label: e.target.value })
                    }
                  />
                  {field.description && (
                    <TextArea
                      placeholder="Описание поля"
                      value={field.description}
                      onChange={(e) =>
                        handleUpdateField(field.id, { description: e.target.value })
                      }
                      style={{ minHeight: '60px' }}
                    />
                  )}
                  <div style={{ display: 'flex', gap: theme.spacing.md, alignItems: 'center' }}>
                    <Select
                      label="Направление"
                      value={field.direction.toString()}
                      onChange={(value) =>
                        handleUpdateField(field.id, {
                          direction: parseInt(value, 10) as 1 | -1,
                        })
                      }
                      options={[
                        { value: '1', label: '✓ Полезный (+1)' },
                        { value: '-1', label: '✗ Вредный (-1)' },
                      ]}
                    />
                    <Input
                      label="Вес"
                      type="number"
                      step="0.1"
                      value={field.weight.toString()}
                      onChange={(e) =>
                        handleUpdateField(field.id, {
                          weight: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </FieldEditor>
            ))}
          </FieldsList>
        </Section>
      )}

      <ButtonsRow>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} fullWidth disabled={generating}>
            Отмена
          </Button>
        )}
        {generatedSchema && (
          <Button
            variant="primary"
            onClick={handleSave}
            fullWidth
            disabled={generating}
          >
            {generating ? 'Сохранение...' : '💾 Сохранить схему'}
          </Button>
        )}
      </ButtonsRow>
    </GeneratorContainer>
  );
};

