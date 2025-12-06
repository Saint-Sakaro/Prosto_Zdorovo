import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { Select } from '../components/common/Select';
import { AchievementCard } from '../components/profile/AchievementCard';
import { gamificationApi, Achievement, UserAchievement } from '../api/gamification';
import { theme } from '../theme';

const AchievementsWrapper = styled.div`
  min-height: calc(100vh - 80px);
  padding: ${({ theme }) => theme.spacing['2xl']} 0;
`;

const PageHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing['3xl']};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize['5xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const PageSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StatsCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  text-align: center;
`;

const StatItem = styled.div``;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const TabsWrapper = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  padding: ${({ theme }) => theme.spacing.sm};
`;

const Tab = styled(motion.button)<{ active: boolean }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme, active }) =>
    active
      ? theme.typography.fontWeight.bold
      : theme.typography.fontWeight.medium};
  color: ${({ theme, active }) =>
    active ? theme.colors.text.inverse : theme.colors.text.secondary};
  background: ${({ theme, active }) =>
    active ? theme.colors.primary.gradient : 'transparent'};
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme, active }) =>
      active ? theme.colors.text.inverse : theme.colors.text.primary};
    background: ${({ theme, active }) =>
      active
        ? theme.colors.primary.gradient
        : 'rgba(255, 255, 255, 0.05)'};
  }
`;

const FiltersCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const FiltersRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
  align-items: center;
`;

const AchievementsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyState = styled(Card)`
  padding: ${({ theme }) => theme.spacing['4xl']};
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize['6xl']};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const EmptyText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing['4xl']};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing['4xl']};
  color: ${({ theme }) => theme.colors.accent.error};
`;

export const Achievements: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [myAchievements, setMyAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    rarity: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (activeTab === 'all') {
          const achievementsData = await gamificationApi.getAchievements();
          setAllAchievements(
            Array.isArray(achievementsData)
              ? achievementsData
              : (achievementsData as any).results || []
          );
        } else {
          // Получаем достижения пользователя
          try {
            const profile = await gamificationApi.getMyProfile();
            const profileId = profile.id;
            if (profileId) {
              const achievementsData = await gamificationApi.getProfileAchievements(
                profileId
              );
              setMyAchievements(
                Array.isArray(achievementsData)
                  ? achievementsData
                  : achievementsData.results || []
              );
            }
          } catch (err) {
            // Если не удалось получить через профиль, пробуем другой способ
            console.warn('Could not fetch user achievements:', err);
            setMyAchievements([]);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки достижений');
        console.error('Error fetching achievements:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  if (loading) {
    return (
      <AchievementsWrapper>
        <Container>
          <LoadingState>Загрузка достижений...</LoadingState>
        </Container>
      </AchievementsWrapper>
    );
  }

  if (error) {
    return (
      <AchievementsWrapper>
        <Container>
          <ErrorState>Ошибка: {error}</ErrorState>
        </Container>
      </AchievementsWrapper>
    );
  }

  // Фильтрация достижений
  const filteredAchievements = allAchievements.filter((achievement) => {
    if (filter.rarity && achievement.rarity !== filter.rarity) {
      return false;
    }
    return true;
  });

  // Получаем список полученных достижений для проверки
  const unlockedAchievementUuids = new Set(
    myAchievements.map((ua) => {
      const achievementId = typeof ua.achievement === 'number' 
        ? (ua as any).achievement_uuid || String(ua.achievement)
        : ua.achievement || (ua as any).achievement_uuid;
      return achievementId;
    })
  );

  // Статистика
  const totalAchievements = allAchievements.length;
  const unlockedCount = myAchievements.length;
  const rareCount = myAchievements.filter(
    (ua) => ua.achievement_rarity === 'rare'
  ).length;
  const epicCount = myAchievements.filter(
    (ua) => ua.achievement_rarity === 'epic'
  ).length;
  const legendaryCount = myAchievements.filter(
    (ua) => ua.achievement_rarity === 'legendary'
  ).length;

  return (
    <AchievementsWrapper>
      <Container>
        <PageHeader
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PageTitle>Достижения</PageTitle>
          <PageSubtitle>
            Открывайте достижения за активность в приложении
          </PageSubtitle>
        </PageHeader>

        <StatsCard glow>
          <StatItem>
            <StatValue>{unlockedCount}</StatValue>
            <StatLabel>Получено</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{totalAchievements}</StatValue>
            <StatLabel>Всего достижений</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{rareCount}</StatValue>
            <StatLabel>Редких</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{epicCount}</StatValue>
            <StatLabel>Эпических</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{legendaryCount}</StatValue>
            <StatLabel>Легендарных</StatLabel>
          </StatItem>
        </StatsCard>

        <TabsWrapper>
          <Tab
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🏆 Все достижения
          </Tab>
          <Tab
            active={activeTab === 'my'}
            onClick={() => setActiveTab('my')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            ⭐ Мои достижения
          </Tab>
        </TabsWrapper>

        {activeTab === 'all' && (
          <>
            <FiltersCard>
              <FiltersRow>
                <Select
                  label="Редкость"
                  value={filter.rarity}
                  onChange={(value) => setFilter({ ...filter, rarity: value })}
                  options={[
                    { value: '', label: 'Все редкости' },
                    { value: 'common', label: 'Обычные' },
                    { value: 'rare', label: 'Редкие' },
                    { value: 'epic', label: 'Эпические' },
                    { value: 'legendary', label: 'Легендарные' },
                  ]}
                  placeholder="Все редкости"
                  fullWidth={false}
                />
              </FiltersRow>
            </FiltersCard>

            {filteredAchievements.length === 0 ? (
              <EmptyState>
                <EmptyIcon>🏆</EmptyIcon>
                <EmptyText>Достижений не найдено</EmptyText>
              </EmptyState>
            ) : (
              <AchievementsGrid>
                {filteredAchievements.map((achievement) => {
                  const achievementId = achievement.uuid;
                  const isUnlocked = unlockedAchievementUuids.has(achievementId);
                  const userAchievement = myAchievements.find(
                    (ua) => {
                      const uaId = typeof ua.achievement === 'number'
                        ? (ua as any).achievement_uuid || String(ua.achievement)
                        : ua.achievement || (ua as any).achievement_uuid;
                      return uaId === achievementId;
                    }
                  );

                  return (
                    <AchievementCard
                      key={achievement.uuid}
                      name={achievement.name}
                      description={achievement.description}
                      rarity={achievement.rarity}
                      icon={achievement.icon || undefined}
                      unlocked={isUnlocked}
                      progress={userAchievement?.progress}
                    />
                  );
                })}
              </AchievementsGrid>
            )}
          </>
        )}

        {activeTab === 'my' && (
          <>
            {myAchievements.length === 0 ? (
              <EmptyState>
                <EmptyIcon>⭐</EmptyIcon>
                <EmptyText>У вас пока нет достижений</EmptyText>
              </EmptyState>
            ) : (
              <AchievementsGrid>
                {myAchievements.map((userAchievement) => (
                  <AchievementCard
                    key={userAchievement.uuid}
                    name={
                      userAchievement.achievement_name ||
                      (userAchievement as any).achievement?.name ||
                      'Достижение'
                    }
                    description={
                      (userAchievement as any).achievement?.description ||
                      'Описание недоступно'
                    }
                    rarity={
                      userAchievement.achievement_rarity ||
                      (userAchievement as any).achievement?.rarity ||
                      'common'
                    }
                    icon={
                      userAchievement.achievement_icon ||
                      (userAchievement as any).achievement?.icon ||
                      undefined
                    }
                    unlocked={true}
                    progress={userAchievement.progress}
                  />
                ))}
              </AchievementsGrid>
            )}
          </>
        )}
      </Container>
    </AchievementsWrapper>
  );
};

