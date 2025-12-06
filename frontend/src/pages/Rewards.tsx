import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { RewardCard } from '../components/rewards/RewardCard';
import { MyRewardCard } from '../components/rewards/MyRewardCard';
import { gamificationApi, Reward, UserReward, UserProfile } from '../api/gamification';
import { theme } from '../theme';

const RewardsWrapper = styled.div`
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

const RewardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PointsDisplay = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  background: ${({ theme }) => theme.colors.primary.gradient};
  border: none;
`;

const PointsValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize['5xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  color: ${({ theme }) => theme.colors.text.inverse};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const PointsLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.inverse};
  opacity: 0.9;
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

const SuccessMessage = styled(motion.div)`
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.success};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.accent.success};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

export const Rewards: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my-rewards'>(
    'marketplace'
  );
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [myRewards, setMyRewards] = useState<UserReward[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    reward_type: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (activeTab === 'marketplace') {
          const [rewardsData, profileData] = await Promise.all([
            gamificationApi.getRewards(),
            gamificationApi.getMyProfile(),
          ]);
          setRewards(rewardsData);
          setProfile(profileData);
        } else {
          const [myRewardsData, profileData] = await Promise.all([
            gamificationApi.getMyRewards(),
            gamificationApi.getMyProfile(),
          ]);
          setMyRewards(Array.isArray(myRewardsData) ? myRewardsData : myRewardsData.results || []);
          setProfile(profileData);
        }
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки данных');
        console.error('Error fetching rewards:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const handlePurchase = async (rewardId: string) => {
    try {
      setPurchasingId(rewardId);
      setError(null);
      setSuccessMessage(null);

      // Находим reward по UUID
      const reward = rewards.find(r => r.uuid === rewardId);
      if (!reward) {
        throw new Error('Награда не найдена');
      }
      
      // Используем ID если есть, иначе UUID
      const rewardIdentifier = reward.id || reward.uuid;
      await gamificationApi.purchaseReward(rewardIdentifier);
      
      // Обновляем профиль и список наград
      const [updatedProfile, updatedRewards] = await Promise.all([
        gamificationApi.getMyProfile(),
        gamificationApi.getRewards(),
      ]);
      
      setProfile(updatedProfile);
      setRewards(updatedRewards);
      setSuccessMessage('Награда успешно приобретена!');
      
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Ошибка при покупке награды'
      );
    } finally {
      setPurchasingId(null);
    }
  };

  const filteredRewards = rewards.filter((reward) => {
    if (filter.reward_type && reward.reward_type !== filter.reward_type) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <RewardsWrapper>
        <Container>
          <LoadingState>Загрузка наград...</LoadingState>
        </Container>
      </RewardsWrapper>
    );
  }

  if (error && !profile) {
    return (
      <RewardsWrapper>
        <Container>
          <ErrorState>Ошибка: {error}</ErrorState>
        </Container>
      </RewardsWrapper>
    );
  }

  return (
    <RewardsWrapper>
      <Container>
        <PageHeader
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PageTitle>Маркетплейс наград</PageTitle>
          <PageSubtitle>
            Обменивайте баллы на скидочные купоны, цифровой мерч и реальные
            призы
          </PageSubtitle>
        </PageHeader>

        {profile && (
          <PointsDisplay glow>
            <PointsValue>{profile.points_balance.toLocaleString()}</PointsValue>
            <PointsLabel>Ваши баллы</PointsLabel>
          </PointsDisplay>
        )}

        <TabsWrapper>
          <Tab
            active={activeTab === 'marketplace'}
            onClick={() => setActiveTab('marketplace')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🛒 Каталог наград
          </Tab>
          <Tab
            active={activeTab === 'my-rewards'}
            onClick={() => setActiveTab('my-rewards')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🎁 Мои награды
          </Tab>
        </TabsWrapper>

        {successMessage && (
          <SuccessMessage
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {successMessage}
          </SuccessMessage>
        )}

        {error && (
          <motion.div
            style={{
              padding: theme.spacing.md,
              background: 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${theme.colors.accent.error}`,
              borderRadius: theme.borderRadius.lg,
              color: theme.colors.accent.error,
              textAlign: 'center',
              marginBottom: theme.spacing.xl,
            }}
          >
            {error}
          </motion.div>
        )}

        {activeTab === 'marketplace' && (
          <>
            <FiltersCard>
              <FiltersRow>
                <Select
                  label="Тип награды"
                  value={filter.reward_type}
                  onChange={(value) => setFilter({ ...filter, reward_type: value })}
                  options={[
                    { value: '', label: 'Все типы' },
                    { value: 'coupon', label: 'Купон' },
                    { value: 'digital_merch', label: 'Цифровой мерч' },
                    { value: 'physical_merch', label: 'Реальный мерч' },
                    { value: 'privilege', label: 'Привилегия' },
                  ]}
                  placeholder="Все типы"
                  fullWidth={false}
                />
              </FiltersRow>
            </FiltersCard>

            {filteredRewards.length === 0 ? (
              <EmptyState>
                <EmptyIcon>🎁</EmptyIcon>
                <EmptyText>Наград не найдено</EmptyText>
              </EmptyState>
            ) : (
              <RewardsGrid>
                {filteredRewards.map((reward) => (
                  <RewardCard
                    key={reward.uuid}
                    reward={reward}
                    userPoints={profile?.points_balance || 0}
                    onPurchase={handlePurchase}
                    isPurchasing={purchasingId === reward.uuid}
                  />
                ))}
              </RewardsGrid>
            )}
          </>
        )}

        {activeTab === 'my-rewards' && (
          <>
            {myRewards.length === 0 ? (
              <EmptyState>
                <EmptyIcon>🎁</EmptyIcon>
                <EmptyText>У вас пока нет наград</EmptyText>
              </EmptyState>
            ) : (
              <RewardsGrid>
                {myRewards.map((userReward) => (
                  <MyRewardCard key={userReward.uuid} userReward={userReward} />
                ))}
              </RewardsGrid>
            )}
          </>
        )}
      </Container>
    </RewardsWrapper>
  );
};

