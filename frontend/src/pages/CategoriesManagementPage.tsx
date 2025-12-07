/**
 * Страница для управления категориями
 * Этап 5: Редактор категорий (для модераторов)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { CategoryEditor } from '../components/places/CategoryEditor';
import { 
  getCategories, 
  createCategory, 
  updateCategory
} from '../api/places';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { POICategory } from '../api/maps';
import { theme } from '../theme';

const PageWrapper = styled(motion.div)`
  min-height: calc(100vh - 80px);
  padding: ${({ theme }) => theme.spacing.xl} 0;
  background: ${({ theme }) => theme.colors.background.main};
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: ${({ theme }) => theme.spacing.xl};
  min-height: 600px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const CategoriesList = styled(Card)`
  padding: ${({ theme }) => theme.spacing.md};
  max-height: 80vh;
  overflow-y: auto;
  position: sticky;
  top: ${({ theme }) => theme.spacing.lg};
`;

const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding-bottom: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.main};
`;

const ListTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const CategoryItem = styled(Card)<{ $selected: boolean }>`
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.primary.main : theme.colors.border.main};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
    border-color: ${({ theme }) => theme.colors.primary.main};
  }

  ${({ $selected, theme }) =>
    $selected &&
    `
    background: ${theme.colors.primary.main}10;
    box-shadow: ${theme.shadows.glow};
  `}
`;

const CategoryName = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ColorBadge = styled.div<{ $color: string }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 2px solid ${({ theme }) => theme.colors.border.main};
  flex-shrink: 0;
`;

const EditorContainer = styled.div`
  position: sticky;
  top: ${({ theme }) => theme.spacing.lg};
  max-height: 90vh;
  overflow-y: auto;
`;

const EmptyState = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LoadingCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const ErrorCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.error};
  color: ${({ theme }) => theme.colors.accent.error};
  text-align: center;
`;

const AccessDeniedCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.error};
`;

const AccessDeniedTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.accent.error};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const AccessDeniedText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

export const CategoriesManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<POICategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<POICategory | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Проверка прав модератора
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isAuthenticated && user) {
        try {
          const userData = await authApi.getCurrentUser();
          const adminStatus =
            (userData as any).is_staff ||
            (userData as any).is_superuser ||
            (userData.user as any)?.is_staff ||
            (userData.user as any)?.is_superuser ||
            false;
          setIsAdmin(adminStatus);
          
          if (!adminStatus) {
            navigate('/', { replace: true });
          }
        } catch (error) {
          setIsAdmin(false);
          navigate('/', { replace: true });
        }
      } else {
        setIsAdmin(false);
        navigate('/', { replace: true });
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, user, navigate]);

  // Загрузка категорий
  useEffect(() => {
    const loadCategories = async () => {
      if (isAdmin !== true) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getCategories();
        setCategories(data);
      } catch (err: any) {
        console.error('Ошибка загрузки категорий:', err);
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            'Не удалось загрузить категории'
        );
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [isAdmin]);


  const handleCreateNew = () => {
    setSelectedCategory(null);
    setEditing(true);
  };

  const handleSelectCategory = (category: POICategory) => {
    setSelectedCategory(category);
    setEditing(true);
  };

  const handleSave = async (
    categoryData: Partial<POICategory>
  ) => {
    try {
      if (selectedCategory) {
        // Обновление существующей категории
        await updateCategory(selectedCategory.uuid, categoryData);
      } else {
        // Создание новой категории
        const newCategory = await createCategory(categoryData);
        
        // Обновляем список категорий
        const updatedCategories = await getCategories();
        setCategories(updatedCategories);
        
        // Если создавали новую, выбираем её из обновленного списка
        const createdCategory = updatedCategories.find((c) => c.uuid === newCategory.uuid);
        if (createdCategory) {
          setSelectedCategory(createdCategory);
        }
      }

      // Если обновляли существующую, обновляем список категорий
      if (selectedCategory) {
        const updatedCategories = await getCategories();
        setCategories(updatedCategories);
      }
      
      setEditing(false);
    } catch (err: any) {
      throw err;
    }
  };

  // Показываем загрузку, пока проверяем права
  if (isAdmin === null) {
    return (
      <PageWrapper
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Container>
          <LoadingCard>
            <div style={{ color: theme.colors.text.secondary }}>Проверка прав доступа...</div>
          </LoadingCard>
        </Container>
      </PageWrapper>
    );
  }

  // Проверка доступа
  if (!isAdmin) {
    return (
      <PageWrapper
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Container>
          <AccessDeniedCard>
            <AccessDeniedTitle>Доступ запрещен</AccessDeniedTitle>
            <AccessDeniedText>
              Эта страница доступна только модераторам
            </AccessDeniedText>
            <Button variant="primary" to="/">
              На главную
            </Button>
          </AccessDeniedCard>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Container>
        <PageHeader>
          <PageTitle>Управление категориями</PageTitle>
        </PageHeader>

        {error && (
          <ErrorCard>
            <div>{error}</div>
            <div style={{ marginTop: theme.spacing.md, textAlign: 'center' }}>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Обновить
              </Button>
            </div>
          </ErrorCard>
        )}

        {!error && (
          <ContentGrid>
            {/* Список категорий */}
            <CategoriesList>
              <ListHeader>
                <ListTitle>Категории</ListTitle>
                <Button variant="primary" size="sm" onClick={handleCreateNew}>
                  ➕
                </Button>
              </ListHeader>
              {loading ? (
                <div style={{ textAlign: 'center', color: theme.colors.text.secondary }}>
                  Загрузка...
                </div>
              ) : categories.length === 0 ? (
                <EmptyState>
                  <div>Нет категорий</div>
                  <div style={{ marginTop: theme.spacing.md }}>
                    <Button variant="primary" size="sm" onClick={handleCreateNew}>
                      Создать первую категорию
                    </Button>
                  </div>
                </EmptyState>
              ) : (
                <div>
                  {categories.map((cat) => (
                    <motion.div
                      key={cat.uuid}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CategoryItem
                        $selected={selectedCategory?.uuid === cat.uuid && editing}
                        onClick={() => handleSelectCategory(cat)}
                      >
                        <CategoryName>
                          <ColorBadge $color={cat.marker_color} />
                          {cat.name}
                        </CategoryName>
                      </CategoryItem>
                    </motion.div>
                  ))}
                </div>
              )}
            </CategoriesList>

            {/* Редактор */}
            <EditorContainer>
              {editing ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedCategory?.uuid || 'new'}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CategoryEditor
                      category={selectedCategory}
                      onSave={handleSave}
                      onCancel={() => {
                        setEditing(false);
                        setSelectedCategory(null);
                      }}
                    />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <Card padding={theme.spacing.xl}>
                  <div style={{ textAlign: 'center', color: theme.colors.text.secondary }}>
                    <div style={{ fontSize: theme.typography.fontSize['2xl'], marginBottom: theme.spacing.md }}>
                      👈
                    </div>
                    <div style={{ fontSize: theme.typography.fontSize.base }}>
                      Выберите категорию для редактирования или создайте новую
                    </div>
                  </div>
                </Card>
              )}
            </EditorContainer>
          </ContentGrid>
        )}
      </Container>
    </PageWrapper>
  );
};

