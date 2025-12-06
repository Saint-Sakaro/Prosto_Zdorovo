import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../auth/Input';
import { Select } from '../common/Select';
import { theme } from '../../theme';

interface ReviewFormProps {
  onSubmit: (data: {
    review_type: 'poi_review' | 'incident';
    latitude: number;
    longitude: number;
    category: string;
    content: string;
    has_media: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
  initialData?: {
    latitude?: number;
    longitude?: number;
  };
}

const FormCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing['2xl']};
`;

const FormTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const TypeSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
`;

const TypeButton = styled(motion.button)<{ active: boolean }>`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 2px solid
    ${({ theme, active }) =>
      active ? theme.colors.primary.main : theme.colors.border.main};
  background: ${({ theme, active }) =>
    active
      ? `${theme.colors.primary.main}20`
      : theme.colors.background.card};
  color: ${({ theme, active }) =>
    active ? theme.colors.primary.main : theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme, active }) =>
    active
      ? theme.typography.fontWeight.bold
      : theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary.main};
    background: ${({ theme }) => `${theme.colors.primary.main}10`};
  }
`;

const TypeIcon = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
`;

const TypeLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const CoordinatesRow = styled.div`
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
  min-height: 120px;
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

const MediaCheckbox = styled.label`
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

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.primary.main};
`;

const CheckboxLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const ErrorMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.error};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.accent.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: center;
`;

const categories = {
  poi_review: [
    'Спортзал',
    'Аптека',
    'Поликлиника',
    'Клиника',
    'Магазин здорового питания',
    'Ресторан здорового питания',
    'Парк',
    'Спортивная площадка',
    'Бассейн',
    'Другое',
  ],
  incident: [
    'Мусор',
    'Разрушенная инфраструктура',
    'Яма на дороге',
    'Неполадка',
    'Нелегальная торговля',
    'Небезопасная зона',
    'Другое',
  ],
};

export const ReviewForm: React.FC<ReviewFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
}) => {
  const [reviewType, setReviewType] = useState<'poi_review' | 'incident'>(
    'poi_review'
  );
  const [latitude, setLatitude] = useState(
    initialData?.latitude?.toString() || ''
  );
  const [longitude, setLongitude] = useState(
    initialData?.longitude?.toString() || ''
  );
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [hasMedia, setHasMedia] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!latitude || !longitude) {
      setError('Укажите координаты');
      return;
    }

    if (!category) {
      setError('Выберите категорию');
      return;
    }

    if (!content.trim()) {
      setError('Введите описание');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        review_type: reviewType,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        category,
        content: content.trim(),
        has_media: hasMedia,
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          'Ошибка при создании отзыва'
      );
    } finally {
      setLoading(false);
    }
  };

  const currentCategories =
    categories[reviewType] || categories.poi_review;

  return (
    <FormCard glow>
      <FormTitle>Создать отзыв</FormTitle>
      <Form onSubmit={handleSubmit}>
        {error && <ErrorMessage>{error}</ErrorMessage>}

        <TypeSelector>
          <TypeButton
            type="button"
            active={reviewType === 'poi_review'}
            onClick={() => {
              setReviewType('poi_review');
              setCategory('');
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <TypeIcon>📍</TypeIcon>
            <TypeLabel>Отзыв о месте</TypeLabel>
          </TypeButton>
          <TypeButton
            type="button"
            active={reviewType === 'incident'}
            onClick={() => {
              setReviewType('incident');
              setCategory('');
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <TypeIcon>⚠️</TypeIcon>
            <TypeLabel>Инцидент</TypeLabel>
          </TypeButton>
        </TypeSelector>

        <CoordinatesRow>
          <Input
            label="Широта"
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="55.7558"
            required
          />
          <Input
            label="Долгота"
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="37.6173"
            required
          />
        </CoordinatesRow>

        <Select
          label="Категория"
          value={category}
          onChange={setCategory}
          options={[
            { value: '', label: 'Выберите категорию' },
            ...currentCategories.map((cat) => ({ value: cat, label: cat })),
          ]}
          placeholder="Выберите категорию"
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
            Описание *
          </label>
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Опишите место или инцидент подробно..."
            required
          />
        </div>

        <MediaCheckbox>
          <Checkbox
            type="checkbox"
            checked={hasMedia}
            onChange={(e) => setHasMedia(e.target.checked)}
          />
          <CheckboxLabel>
            У меня есть фото или видео для подтверждения
          </CheckboxLabel>
        </MediaCheckbox>

        <ButtonsRow>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={onCancel}
              disabled={loading}
            >
              Отмена
            </Button>
          )}
          <Button
            type="submit"
            fullWidth
            disabled={loading || !latitude || !longitude || !category || !content}
          >
            {loading ? 'Отправка...' : 'Создать отзыв'}
          </Button>
        </ButtonsRow>
      </Form>
    </FormCard>
  );
};

