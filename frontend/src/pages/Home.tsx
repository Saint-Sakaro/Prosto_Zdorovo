import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../theme';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

const HomeWrapper = styled.div`
  min-height: calc(100vh - 80px);
  padding: ${({ theme }) => theme.spacing['4xl']} 0;
`;

const HeroSection = styled.section`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing['4xl']};
`;

const HeroTitle = styled(motion.h1)`
  font-size: ${({ theme }) => theme.typography.fontSize['6xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};

  @media (max-width: 768px) {
    font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  }
`;

const HeroSubtitle = styled(motion.p)`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 600px;
  margin: 0 auto ${({ theme }) => theme.spacing['2xl']};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const HeroButtons = styled(motion.div)`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
  flex-wrap: wrap;
`;

const FeaturesSection = styled.section`
  margin-top: ${({ theme }) => theme.spacing['4xl']};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing['3xl']};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};
  margin-top: ${({ theme }) => theme.spacing['2xl']};
`;

const FeatureCard = styled(Card)`
  text-align: center;
  padding: ${({ theme }) => theme.spacing['2xl']};
`;

const FeatureIcon = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  background: ${({ theme }) => theme.colors.primary.gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  box-shadow: ${({ theme }) => theme.shadows.glow};
`;

const FeatureTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const FeatureDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const StatsSection = styled.section`
  margin-top: ${({ theme }) => theme.spacing['4xl']};
  padding: ${({ theme }) => theme.spacing['3xl']} 0;
  background: rgba(0, 217, 165, 0.05);
  border-radius: ${({ theme }) => theme.borderRadius['2xl']};
  border: 1px solid ${({ theme }) => theme.colors.border.accent};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const StatItem = styled(motion.div)``;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize['5xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

export const Home: React.FC = () => {
  const features = [
    {
      icon: '⭐',
      title: 'Система рейтингов',
      description:
        'Зарабатывайте репутацию и баллы за качественные отзывы и фиксацию инцидентов',
    },
    {
      icon: '🏆',
      title: 'Таблицы лидеров',
      description:
        'Соревнуйтесь с другими пользователями в глобальном и месячном рейтингах',
    },
    {
      icon: '🎁',
      title: 'Маркетплейс наград',
      description:
        'Обменивайте баллы на скидочные купоны, цифровой мерч и реальные призы',
    },
    {
      icon: '🎯',
      title: 'Достижения',
      description:
        'Получайте уникальные достижения за различные активности в приложении',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Активных пользователей' },
    { value: '50K+', label: 'Отзывов и инцидентов' },
    { value: '100+', label: 'Доступных наград' },
    { value: '24/7', label: 'Поддержка модерации' },
  ];

  return (
    <HomeWrapper>
      <Container>
        <HeroSection>
          <HeroTitle
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Карта Здоровья
          </HeroTitle>
          <HeroSubtitle
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Отмечайте объекты здоровья на карте, оставляйте отзывы и зарабатывайте награды за
            активность!
          </HeroSubtitle>
          <HeroButtons
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Button size="lg" to="/leaderboard">
              Смотреть лидеров
            </Button>
            <Button size="lg" variant="outline" to="/profile">
              Мой профиль
            </Button>
          </HeroButtons>
        </HeroSection>

        <FeaturesSection>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <SectionTitle>Возможности платформы</SectionTitle>
          </motion.div>
          <FeaturesGrid>
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <FeatureCard hover glow>
                  <FeatureIcon>{feature.icon}</FeatureIcon>
                  <FeatureTitle>{feature.title}</FeatureTitle>
                  <FeatureDescription>{feature.description}</FeatureDescription>
                </FeatureCard>
              </motion.div>
            ))}
          </FeaturesGrid>
        </FeaturesSection>

        <StatsSection>
          <StatsGrid>
            {stats.map((stat, index) => (
              <StatItem
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <StatValue>{stat.value}</StatValue>
                <StatLabel>{stat.label}</StatLabel>
              </StatItem>
            ))}
          </StatsGrid>
        </StatsSection>
      </Container>
    </HomeWrapper>
  );
};

