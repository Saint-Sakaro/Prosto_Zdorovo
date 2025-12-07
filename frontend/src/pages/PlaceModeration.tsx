/**
 * Страница для модерации заявок
 * Этап 3: Модерация заявок (для модераторов)
 * Доступна только модераторам
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ModerationPanel } from '../components/places/ModerationPanel';
import { getPendingSubmissions, moderateSubmission, PlaceSubmission } from '../api/places';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { theme } from '../theme';

const PageWrapper = styled(motion.div)`
  min-height: calc(100vh - 80px);
  padding: ${({ theme }) => theme.spacing.xl} 0;
  background: ${({ theme }) => theme.colors.background.main};
`;

const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PageSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: ${({ theme }) => theme.spacing.xl};
  min-height: 600px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const SubmissionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  max-height: 80vh;
  overflow-y: auto;
  padding-right: ${({ theme }) => theme.spacing.sm};
`;

const SubmissionCard = styled(Card)<{ $selected: boolean }>`
  padding: ${({ theme }) => theme.spacing.md};
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

const SubmissionName = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const SubmissionAddress = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const SubmissionCategory = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const SubmissionDate = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const PanelContainer = styled.div`
  position: sticky;
  top: ${({ theme }) => theme.spacing.lg};
  max-height: 90vh;
  overflow-y: auto;
`;

const EmptyState = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const EmptyStateTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const EmptyStateText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
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

export const PlaceModerationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [submissions, setSubmissions] = useState<PlaceSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<PlaceSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moderating, setModerating] = useState(false);
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
            // Редирект на главную, если не модератор
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

  // Загрузка заявок на модерацию
  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPendingSubmissions();
        setSubmissions(data);
        // Автоматически выбираем первую заявку, если есть
        if (data.length > 0 && !selectedSubmission) {
          setSelectedSubmission(data[0]);
        }
      } catch (err: any) {
        console.error('Ошибка загрузки заявок:', err);
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            'Не удалось загрузить заявки на модерацию'
        );
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin === true) {
      loadSubmissions();
    }
  }, [isAdmin]);

  const handleModerate = async (
    action: 'approve' | 'reject' | 'request_changes',
    comment: string
  ) => {
    if (!selectedSubmission) return;

    try {
      setModerating(true);
      await moderateSubmission(selectedSubmission.uuid, action, comment);
      
      // Удаляем заявку из списка
      setSubmissions((prev) => prev.filter((s) => s.uuid !== selectedSubmission.uuid));
      
      // Выбираем следующую заявку или очищаем выбор
      const remaining = submissions.filter((s) => s.uuid !== selectedSubmission.uuid);
      if (remaining.length > 0) {
        setSelectedSubmission(remaining[0]);
      } else {
        setSelectedSubmission(null);
      }
    } catch (err: any) {
      console.error('Ошибка модерации:', err);
      throw err;
    } finally {
      setModerating(false);
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
          <PageTitle>Модерация заявок</PageTitle>
          <PageSubtitle>
            Просмотрите заявки на добавление мест и примите решение
          </PageSubtitle>
        </PageHeader>

        {loading && (
          <LoadingCard>
            <div style={{ color: theme.colors.text.secondary }}>Загрузка заявок...</div>
          </LoadingCard>
        )}

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

        {!loading && !error && (
          <ContentGrid>
            {/* Список заявок */}
            <div>
              <h3 style={{ 
                marginBottom: theme.spacing.md,
                fontSize: theme.typography.fontSize.lg,
                color: theme.colors.text.primary
              }}>
                Заявки на модерацию ({submissions.length})
              </h3>
              {submissions.length === 0 ? (
                <EmptyState>
                  <EmptyStateTitle>Нет заявок на модерацию</EmptyStateTitle>
                  <EmptyStateText>
                    Все заявки обработаны. Новые заявки появятся здесь автоматически.
                  </EmptyStateText>
                </EmptyState>
              ) : (
                <SubmissionsList>
                  {submissions.map((submission) => (
                    <motion.div
                      key={submission.uuid}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <SubmissionCard
                        $selected={selectedSubmission?.uuid === submission.uuid}
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <SubmissionName>{submission.name}</SubmissionName>
                        <SubmissionAddress>📍 {submission.address}</SubmissionAddress>
                        <SubmissionCategory>
                          🏷️ {submission.category?.name || submission.category_slug}
                        </SubmissionCategory>
                        <SubmissionDate>
                          📅{' '}
                          {new Date(submission.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </SubmissionDate>
                        {submission.llm_verdict && (
                          <div
                            style={{
                              marginTop: theme.spacing.xs,
                              fontSize: theme.typography.fontSize.xs,
                              color: theme.colors.text.muted,
                            }}
                          >
                            🤖 LLM: {submission.llm_verdict.verdict === 'approve' ? 'Одобрить' : 
                            submission.llm_verdict.verdict === 'reject' ? 'Отклонить' : 
                            'Запросить изменения'} ({Math.round(submission.llm_verdict.confidence * 100)}%)
                          </div>
                        )}
                      </SubmissionCard>
                    </motion.div>
                  ))}
                </SubmissionsList>
              )}
            </div>

            {/* Панель модерации */}
            <PanelContainer>
              {selectedSubmission ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedSubmission.uuid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ModerationPanel
                      submission={selectedSubmission}
                      onModerate={handleModerate}
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
                      Выберите заявку для модерации
                    </div>
                  </div>
                </Card>
              )}
            </PanelContainer>
          </ContentGrid>
        )}
      </Container>
    </PageWrapper>
  );
};

