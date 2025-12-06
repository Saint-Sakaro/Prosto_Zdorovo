import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable';
import { LeaderboardTabs } from '../components/leaderboard/LeaderboardTabs';
import { LeaderboardHeader } from '../components/leaderboard/LeaderboardHeader';
import { gamificationApi, LeaderboardEntry } from '../api/gamification';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';

const LeaderboardWrapper = styled.div`
  min-height: calc(100vh - 80px);
  padding: ${({ theme }) => theme.spacing['2xl']} 0;
`;

const ContentCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing['4xl']};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
`;

const ErrorState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing['4xl']};
  color: ${({ theme }) => theme.colors.accent.error};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing['4xl']};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyStateIcon = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize['6xl']};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const EmptyStateText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PaginationWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const PaginationButton = styled.button<{ disabled?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme, disabled }) =>
    disabled
      ? 'rgba(255, 255, 255, 0.05)'
      : theme.colors.background.card};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  color: ${({ theme, disabled }) =>
    disabled ? theme.colors.text.muted : theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primary.main};
    color: ${({ theme }) => theme.colors.text.inverse};
    border-color: ${({ theme }) => theme.colors.primary.main};
  }
`;

const PageInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const Leaderboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'global' | 'monthly'>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserPosition, setCurrentUserPosition] = useState<number | undefined>();
  const [currentUserUuid, setCurrentUserUuid] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(50);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const offset = (currentPage - 1) * limit;

        // Получаем данные лидеров и позицию пользователя
        const promises: Promise<any>[] = [
          activeTab === 'global'
            ? gamificationApi.getGlobalLeaderboard({ limit, offset })
            : gamificationApi.getMonthlyLeaderboard({ limit, offset }),
        ];

        // Получаем позицию и UUID только если пользователь авторизован
        if (isAuthenticated) {
          promises.push(
            gamificationApi.getMyPosition(activeTab).catch(() => null),
            gamificationApi.getMyProfile().catch(() => null)
          );
        } else {
          promises.push(Promise.resolve(null), Promise.resolve(null));
        }

        const [leaderboardData, positionData, profileData] = await Promise.all(promises);

        setEntries(leaderboardData.results || []);
        setTotalCount(leaderboardData.count || leaderboardData.results?.length || 0);
        setCurrentUserPosition(positionData?.position);
        setCurrentUserUuid(profileData?.uuid || null);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки таблицы лидеров');
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [activeTab, currentPage, limit, isAuthenticated]);

  const handleTabChange = (tab: 'global' | 'monthly') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  if (loading && entries.length === 0) {
    return (
      <LeaderboardWrapper>
        <Container>
          <ContentCard>
            <LoadingState>Загрузка таблицы лидеров...</LoadingState>
          </ContentCard>
        </Container>
      </LeaderboardWrapper>
    );
  }

  if (error) {
    return (
      <LeaderboardWrapper>
        <Container>
          <ContentCard>
            <ErrorState>Ошибка: {error}</ErrorState>
          </ContentCard>
        </Container>
      </LeaderboardWrapper>
    );
  }

  return (
    <LeaderboardWrapper>
      <Container>
        <LeaderboardHeader
          type={activeTab}
          totalCount={totalCount}
          currentUserPosition={currentUserPosition}
        />

        <ContentCard glow>
          <LeaderboardTabs activeTab={activeTab} onTabChange={handleTabChange} />

          {entries.length === 0 ? (
            <EmptyState>
              <EmptyStateIcon>🏆</EmptyStateIcon>
              <EmptyStateText>
                {activeTab === 'global'
                  ? 'Таблица лидеров пуста'
                  : 'Месячный рейтинг будет доступен после начала активности'}
              </EmptyStateText>
            </EmptyState>
          ) : (
            <>
              <LeaderboardTable
                entries={entries}
                type={activeTab}
                currentUserPosition={currentUserPosition}
                currentUserUuid={currentUserUuid}
              />

              {totalPages > 1 && (
                <PaginationWrapper>
                  <PaginationButton
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={!hasPrevPage}
                  >
                    ← Назад
                  </PaginationButton>
                  <PageInfo>
                    Страница {currentPage} из {totalPages}
                  </PageInfo>
                  <PaginationButton
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={!hasNextPage}
                  >
                    Вперед →
                  </PaginationButton>
                </PaginationWrapper>
              )}
            </>
          )}
        </ContentCard>
      </Container>
    </LeaderboardWrapper>
  );
};

