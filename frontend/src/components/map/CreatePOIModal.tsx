import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../auth/Input';
import { Select } from '../common/Select';
import { theme } from '../../theme';
import { mapsApi, POICategory } from '../../api/maps';

interface CreatePOIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (poiData: {
    name: string;
    category: string;
    address: string;
    latitude: number;
    longitude: number;
    description?: string;
    phone?: string;
    website?: string;
  }) => Promise<void>;
  initialCoordinates?: [number, number];
}

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const ModalContent = styled(motion.div)`
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  padding: ${({ theme }) => theme.spacing.xl};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  box-shadow: ${({ theme }) => theme.shadows.xl};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ModalTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  padding: ${({ theme }) => theme.spacing.xs};
  transition: all 0.2s ease;
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
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

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
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

const ButtonsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

export const CreatePOIModal: React.FC<CreatePOIModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCoordinates,
}) => {
  const [categories, setCategories] = useState<POICategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    address: '',
    latitude: initialCoordinates?.[0]?.toString() || '',
    longitude: initialCoordinates?.[1]?.toString() || '',
    description: '',
    phone: '',
    website: '',
  });

  // Загрузка категорий
  useEffect(() => {
    if (isOpen) {
      const loadCategories = async () => {
        try {
          setLoading(true);
          const data = await mapsApi.getCategories();
          // Обрабатываем разные форматы ответа (как в CategoryFilters)
          const categoriesList = Array.isArray(data) 
            ? data 
            : ((data as any).results || (data as any).data || []);
          
          if (Array.isArray(categoriesList)) {
            setCategories(categoriesList.filter((cat) => cat.is_active));
          } else {
            console.error('Неожиданный формат ответа категорий:', data);
            setCategories([]);
          }
        } catch (err: any) {
          console.error('Ошибка загрузки категорий:', err);
          setError('Не удалось загрузить категории');
          setCategories([]);
        } finally {
          setLoading(false);
        }
      };

      loadCategories();
    }
  }, [isOpen]);

  // Обновление координат при изменении initialCoordinates
  useEffect(() => {
    if (initialCoordinates) {
      setFormData((prev) => ({
        ...prev,
        latitude: initialCoordinates[0].toString(),
        longitude: initialCoordinates[1].toString(),
      }));
    }
  }, [initialCoordinates]);

  // Обратное геокодирование для получения адреса
  useEffect(() => {
    const geocodeAddress = async () => {
      if (initialCoordinates && !formData.address) {
        try {
          const result = await mapsApi.reverseGeocode({
            latitude: initialCoordinates[0],
            longitude: initialCoordinates[1],
          });
          setFormData((prev) => ({
            ...prev,
            address: result.formatted_address || '',
          }));
        } catch (err) {
          console.error('Ошибка геокодирования:', err);
        }
      }
    };

    if (isOpen && initialCoordinates) {
      geocodeAddress();
    }
  }, [isOpen, initialCoordinates, formData.address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Введите название объекта');
      return;
    }

    if (!formData.category) {
      setError('Выберите категорию');
      return;
    }

    if (!formData.address.trim()) {
      setError('Введите адрес');
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      setError('Укажите координаты');
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setError('Некорректные координаты');
      return;
    }

    setSaving(true);

    try {
      await onSave({
        name: formData.name.trim(),
        category: formData.category,
        address: formData.address.trim(),
        latitude: lat,
        longitude: lon,
        description: formData.description.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        website: formData.website.trim() || undefined,
      });

      // Сброс формы
      setFormData({
        name: '',
        category: '',
        address: '',
        latitude: initialCoordinates?.[0]?.toString() || '',
        longitude: initialCoordinates?.[1]?.toString() || '',
        description: '',
        phone: '',
        website: '',
      });
      setError(null);
      onClose();
    } catch (err: any) {
      console.error('Ошибка создания объекта:', err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Не удалось создать объект'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <ModalContent
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <ModalHeader>
            <ModalTitle>Добавить объект на карту</ModalTitle>
            <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Form onSubmit={handleSubmit}>
            <Input
              label="Название объекта *"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Например: Аптека №1"
              required
            />

            <Select
              label="Категория *"
              value={formData.category}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, category: value }))
              }
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

            <Input
              label="Адрес *"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="Адрес объекта"
              required
            />

            <FormRow>
              <Input
                label="Широта *"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, latitude: e.target.value }))
                }
                placeholder="55.7558"
                required
              />
              <Input
                label="Долгота *"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, longitude: e.target.value }))
                }
                placeholder="37.6173"
                required
              />
            </FormRow>

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
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Описание объекта (необязательно)"
              />
            </div>

            <FormRow>
              <Input
                label="Телефон"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+7 (495) 123-45-67"
              />
              <Input
                label="Сайт"
                type="url"
                value={formData.website}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, website: e.target.value }))
                }
                placeholder="https://example.com"
              />
            </FormRow>

            <ButtonsRow>
              <Button variant="outline" onClick={onClose} fullWidth disabled={saving}>
                Отмена
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={saving || loading}
              >
                {saving ? 'Создание...' : 'Создать объект'}
              </Button>
            </ButtonsRow>
          </Form>
        </ModalContent>
      </Overlay>
    </AnimatePresence>
  );
};

