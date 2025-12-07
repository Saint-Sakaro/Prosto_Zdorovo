/**
 * Компонент для редактирования категорий
 * Редактор категорий (для модераторов)
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../auth/Input';
import { POICategory } from '../../api/maps';
import { theme } from '../../theme';

interface CategoryEditorProps {
  category?: POICategory | null;
  onSave: (categoryData: Partial<POICategory>) => Promise<void>;
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

export const CategoryEditor: React.FC<CategoryEditorProps> = ({
  category,
  onSave,
  onCancel,
}) => {
  const [categoryData, setCategoryData] = useState({
    name: category?.name || '',
    description: (category as any)?.description || '',
    marker_color: category?.marker_color || '#FF0000',
    display_order: category?.display_order || 0,
    is_active: category?.is_active ?? true,
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Обновление данных при изменении category
  useEffect(() => {
    if (category) {
      setCategoryData({
        name: category.name || '',
        description: (category as any)?.description || '',
        marker_color: category.marker_color || '#FF0000',
        display_order: category.display_order || 0,
        is_active: category.is_active ?? true,
      });
    }
  }, [category]);

  const handleCategoryChange = (field: string, value: any) => {
    setCategoryData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация
    if (!categoryData.name.trim()) {
      setError('Введите название категории');
      return;
    }

    setSaving(true);
    try {
      await onSave(categoryData);
    } catch (err: any) {
      console.error('Ошибка сохранения категории:', err);
      const errorMessage = 
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data?.detail ||
        (err.response?.data && typeof err.response.data === 'object' 
          ? JSON.stringify(err.response.data) 
          : 'Не удалось сохранить категорию');
      setError(errorMessage);
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

