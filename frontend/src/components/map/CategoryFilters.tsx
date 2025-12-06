import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../common/Card';
import { mapsApi, POICategory } from '../../api/maps';
import { theme } from '../../theme';

const FiltersCard = styled(Card)`
  position: relative;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

const FiltersHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding-bottom: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.main};
`;

const FiltersTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const ToggleButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  padding: ${({ theme }) => theme.spacing.xs};
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const FilterList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const FilterItem = styled(motion.label)<{ checked: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ theme, checked }) =>
    checked
      ? `${theme.colors.primary.main}20`
      : 'transparent'};
  border: 1px solid
    ${({ theme, checked }) =>
      checked ? theme.colors.primary.main : theme.colors.border.main};

  &:hover {
    background: ${({ theme, checked }) =>
      checked
        ? `${theme.colors.primary.main}30`
        : 'rgba(255, 255, 255, 0.05)'};
  }
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.primary.main};
`;

const FilterLabel = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const ColorIndicator = styled.div<{ color: string }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${({ color }) => color};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  flex-shrink: 0;
`;

const SelectAllButton = styled.button`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background.card};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.primary.main}20;
    color: ${({ theme }) => theme.colors.primary.main};
    border-color: ${({ theme }) => theme.colors.primary.main};
  }
`;

const LoadingState = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const ErrorState = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  text-align: center;
  color: ${({ theme }) => theme.colors.accent.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

interface CategoryFiltersProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  selectedCategories,
  onCategoriesChange,
}) => {
  const [categories, setCategories] = useState<POICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await mapsApi.getCategories();
        // Обрабатываем разные форматы ответа
        const categoriesList = Array.isArray(data) 
          ? data 
          : ((data as any).results || (data as any).data || []);
        setCategories(categoriesList);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки категорий');
        console.error('Error loading categories:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Автоматически выбираем все категории при первой загрузке
  useEffect(() => {
    if (categories.length > 0 && !isInitialized && !userHasInteracted) {
      const allSlugs = categories.map(cat => cat.slug);
      onCategoriesChange(allSlugs);
      setIsInitialized(true);
    }
  }, [categories, isInitialized, userHasInteracted, onCategoriesChange]);

  const handleToggleCategory = (slug: string) => {
    setUserHasInteracted(true);
    if (selectedCategories.includes(slug)) {
      onCategoriesChange(selectedCategories.filter((s) => s !== slug));
    } else {
      onCategoriesChange([...selectedCategories, slug]);
    }
  };

  const handleSelectAll = () => {
    setUserHasInteracted(true);
    if (selectedCategories.length === categories.length) {
      onCategoriesChange([]);
    } else {
      onCategoriesChange(categories.map((c) => c.slug));
    }
  };

  if (loading) {
    return (
      <FiltersCard>
        <LoadingState>Загрузка категорий...</LoadingState>
      </FiltersCard>
    );
  }

  if (error) {
    return (
      <FiltersCard>
        <ErrorState>{error}</ErrorState>
      </FiltersCard>
    );
  }

  return (
    <FiltersCard>
      <FiltersHeader>
        <FiltersTitle>Категории</FiltersTitle>
        <ToggleButton onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? '▼' : '▲'}
        </ToggleButton>
      </FiltersHeader>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FilterList>
              {Array.isArray(categories) && categories.length > 0 && (
                <FilterItem
                  key="select-all"
                  checked={selectedCategories.length === categories.length && categories.length > 0}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ 
                    fontWeight: 600,
                    background: selectedCategories.length === categories.length && categories.length > 0
                      ? 'linear-gradient(135deg, rgba(0, 217, 165, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)'
                      : 'transparent',
                    border: selectedCategories.length === categories.length && categories.length > 0
                      ? '1px solid rgba(0, 217, 165, 0.5)'
                      : '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <Checkbox
                    checked={selectedCategories.length === categories.length && categories.length > 0}
                    onChange={handleSelectAll}
                  />
                  <FilterLabel style={{ fontWeight: 600 }}>
                    <span>✓</span>
                    {selectedCategories.length === categories.length && categories.length > 0
                      ? 'Снять все'
                      : 'Выбрать все'}
                  </FilterLabel>
                </FilterItem>
              )}

              {Array.isArray(categories) && categories.map((category) => (
                <FilterItem
                  key={category.uuid}
                  checked={selectedCategories.includes(category.slug)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Checkbox
                    checked={selectedCategories.includes(category.slug)}
                    onChange={() => handleToggleCategory(category.slug)}
                  />
                  <FilterLabel>
                    <ColorIndicator color={category.marker_color} />
                    {category.name}
                  </FilterLabel>
                </FilterItem>
              ))}
            </FilterList>
          </motion.div>
        )}
      </AnimatePresence>
    </FiltersCard>
  );
};

