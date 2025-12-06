import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/profile/StatCard';
import { ProgressBar } from '../components/profile/ProgressBar';
import { LevelBadge } from '../components/profile/LevelBadge';
import { AchievementCard } from '../components/profile/AchievementCard';
import { TransactionItem } from '../components/profile/TransactionItem';
import { gamificationApi, UserProfile, UserAchievement, RewardTransaction } from '../api/gamification';
import apiClient from '../api/client';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';

const ProfileWrapper = styled.div`
  min-height: calc(100vh - 80px);
  padding: ${({ theme }) => theme.spacing['2xl']} 0;
`;

const ProfileHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing['3xl']};
`;

const ProfileTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize['5xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ProfileSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing['3xl']};
`;

const ProfileSection = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing['3xl']};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const LevelSection = styled(Card)`
  padding: ${({ theme }) => theme.spacing['2xl']};
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing['3xl']};
`;

const LevelInfo = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xl};
  width: 100%;
  max-width: 600px;
`;

const AchievementsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};
`;

const TransactionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
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

// Функция для расчета опыта до следующего уровня
const calculateExperienceForNextLevel = (currentLevel: number): number => {
  return currentLevel * 1000; // Простая формула: каждый уровень требует level * 1000 опыта
};

export const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: authUser } = useAuth();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        // Сбрасываем предыдущие данные при смене пользователя
        setProfile(null);
        setAchievements([]);
        setTransactions([]);
        setError(null);
        
        // Проверяем наличие токена перед запросом
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Требуется авторизация. Пожалуйста, войдите в систему.');
          setLoading(false);
          return;
        }
        
        const profileData = await gamificationApi.getMyProfile();
        
        // Используем ID из профиля (теперь он есть в сериализаторе)
        const profileId = profileData.id;
        
        if (!profileId) {
          setError('ID профиля не найден');
          setLoading(false);
          return;
        }
        
        const [achievementsData, transactionsData] = await Promise.all([
          apiClient.get(`/gamification/profiles/${profileId}/achievements/`)
            .then(r => Array.isArray(r.data) ? r.data : [])
            .catch(() => []),
          apiClient.get(`/gamification/profiles/${profileId}/transactions/`, {
            params: { limit: 10, offset: 0 },
          })
            .then(r => r.data.results || [])
            .catch(() => []),
        ]);

        setProfile(profileData);
        setAchievements(achievementsData);
        setTransactions(transactionsData);
        setError(null);
      } catch (err: any) {
        // Обрабатываем ошибку 401 (неавторизован)
        if (err.response?.status === 401) {
          setError('Сессия истекла. Пожалуйста, войдите в систему снова.');
          // Очищаем токены
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        } else {
          setError(err.message || 'Ошибка загрузки данных профиля');
        }
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [authUser?.id]); // Перезагружаем профиль при смене пользователя

  if (loading) {
    return (
      <ProfileWrapper>
        <Container>
          <LoadingState>Загрузка профиля...</LoadingState>
        </Container>
      </ProfileWrapper>
    );
  }

  if (error) {
    return (
      <ProfileWrapper>
        <Container>
          <ErrorState>Ошибка: {error}</ErrorState>
        </Container>
      </ProfileWrapper>
    );
  }

  if (!profile) {
    return (
      <ProfileWrapper>
        <Container>
          <ErrorState>Профиль не найден</ErrorState>
        </Container>
      </ProfileWrapper>
    );
  }

  const experienceForNextLevel = calculateExperienceForNextLevel(profile.level);
  const experienceProgress = (profile.experience / experienceForNextLevel) * 100;

  return (
    <ProfileWrapper>
      <Container>
        <ProfileHeader
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ProfileTitle>Профиль пользователя</ProfileTitle>
          <ProfileSubtitle>{profile.username}</ProfileSubtitle>
        </ProfileHeader>

        <StatsGrid>
          <StatCard
            title="Общий рейтинг"
            value={profile.total_reputation.toLocaleString()}
            icon="⭐"
            gradient={theme.colors.game.reputation}
            delay={0.1}
          />
          <StatCard
            title="Месячный рейтинг"
            value={profile.monthly_reputation.toLocaleString()}
            icon="📅"
            gradient={theme.colors.secondary.gradient}
            delay={0.2}
          />
          <StatCard
            title="Баллы"
            value={profile.points_balance.toLocaleString()}
            icon="💰"
            gradient={theme.colors.game.points}
            delay={0.3}
          />
          <StatCard
            title="Уникальных отзывов"
            value={profile.unique_reviews_count}
            icon="✍️"
            gradient={theme.colors.primary.gradient}
            delay={0.4}
          />
        </StatsGrid>

        <LevelSection glow>
          <LevelBadge level={profile.level} size="lg" />
          <LevelInfo>
            <ProgressBar
              current={profile.experience}
              max={experienceForNextLevel}
              label={`Опыт до уровня ${profile.level + 1}`}
              gradient={theme.colors.primary.gradient}
            />
          </LevelInfo>
        </LevelSection>

        {achievements.length > 0 && (
          <ProfileSection>
            <SectionTitle>
              <span>🏆</span>
              Достижения
            </SectionTitle>
            <AchievementsGrid>
              {achievements.map((achievement: any, index: number) => (
                <AchievementCard
                  key={achievement.uuid || index}
                  name={achievement.achievement_name || achievement.name || 'Достижение'}
                  description={achievement.achievement?.description || achievement.description || ''}
                  rarity={achievement.achievement_rarity || achievement.rarity || 'common'}
                  icon={achievement.achievement_icon || achievement.icon || '🏆'}
                  unlocked={true}
                  progress={achievement.progress}
                />
              ))}
            </AchievementsGrid>
          </ProfileSection>
        )}

        {transactions.length > 0 && (
          <ProfileSection>
            <SectionTitle>
              <span>📊</span>
              История транзакций
            </SectionTitle>
            <TransactionsList>
              {transactions.map((transaction: any, index: number) => (
                <TransactionItem
                  key={transaction.uuid || index}
                  type={transaction.transaction_type}
                  amount={transaction.amount}
                  reason={transaction.reason}
                  date={transaction.created_at}
                  balanceAfter={transaction.balance_after}
                />
              ))}
            </TransactionsList>
          </ProfileSection>
        )}
      </Container>
    </ProfileWrapper>
  );
};

