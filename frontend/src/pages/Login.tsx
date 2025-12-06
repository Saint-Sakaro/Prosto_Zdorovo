import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/auth/Input';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

const LoginWrapper = styled.div`
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing['2xl']} 0;
  width: 100%;
`;

const LoginContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing['3xl']};
  width: 100%;
  max-width: 1200px;
  align-items: center;
  margin: 0 auto;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing.xl};
    max-width: 100%;
  }
`;

const FormSection = styled(motion.div)`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const VisualSection = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: ${({ theme }) => theme.spacing['2xl']};

  @media (max-width: 968px) {
    order: -1;
    padding: ${({ theme }) => theme.spacing.lg};
  }
`;

const LoginCard = styled(Card)`
  width: 100%;
  padding: ${({ theme }) => theme.spacing['2xl']};
`;

const Title = styled(motion.h1)`
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
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

const LinkWrapper = styled.div`
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.lg};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StyledLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary.main};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary.light};
  }
`;

// Визуальные элементы
const VisualCard = styled(Card)`
  width: 100%;
  max-width: 500px;
  padding: ${({ theme }) => theme.spacing['3xl']};
  text-align: center;
  position: relative;
  overflow: hidden;
`;

const VisualTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const VisualDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const FeaturesList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  text-align: left;
`;

const FeatureItem = styled(motion.li)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const FeatureIcon = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.primary.gradient};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  flex-shrink: 0;
`;

const FloatingIcon = styled(motion.div)`
  position: absolute;
  font-size: ${({ theme }) => theme.typography.fontSize['6xl']};
  opacity: 0.1;
  pointer-events: none;
`;

const features = [
  { icon: '⭐', text: 'Зарабатывайте рейтинг за активность' },
  { icon: '🏆', text: 'Участвуйте в таблицах лидеров' },
  { icon: '🎁', text: 'Получайте награды за достижения' },
  { icon: '🗺️', text: 'Отмечайте объекты на карте здоровья' },
];

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Если уже авторизован, редиректим
  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err: any) {
      // Обрабатываем различные форматы ошибок от Django REST Framework
      let errorMessage = 'Неверное имя пользователя или пароль';
      
      if (err.response?.data) {
        const data = err.response.data;
        // JWT serializer возвращает ошибки в non_field_errors
        if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors[0];
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginWrapper>
      <Container style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <LoginContainer>
          <FormSection
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <LoginCard glow>
              <Title
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Добро пожаловать!
              </Title>
              <Subtitle>Войдите в свой аккаунт для продолжения</Subtitle>

              <Form onSubmit={handleSubmit}>
                {error && <ErrorMessage>{error}</ErrorMessage>}

                <Input
                  label="Имя пользователя"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Введите имя пользователя"
                />

                <Input
                  label="Пароль"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Введите пароль"
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={loading || !username || !password}
                >
                  {loading ? 'Вход...' : 'Войти'}
                </Button>
              </Form>

              <LinkWrapper>
                Нет аккаунта?{' '}
                <StyledLink to="/register">Зарегистрироваться</StyledLink>
              </LinkWrapper>
            </LoginCard>
          </FormSection>

          <VisualSection
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <VisualCard glow>
              <FloatingIcon
                style={{ top: '10%', left: '10%' }}
                animate={{
                  y: [0, -20, 0],
                  rotate: [0, 10, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                🏥
              </FloatingIcon>
              <FloatingIcon
                style={{ top: '20%', right: '15%' }}
                animate={{
                  y: [0, 15, 0],
                  rotate: [0, -10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
              >
                ⭐
              </FloatingIcon>
              <FloatingIcon
                style={{ bottom: '20%', left: '15%' }}
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, 10, 0],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1,
                }}
              >
                🎯
              </FloatingIcon>
              <FloatingIcon
                style={{ bottom: '10%', right: '10%' }}
                animate={{
                  y: [0, 20, 0],
                  rotate: [0, -10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1.5,
                }}
              >
                🏆
              </FloatingIcon>

              <VisualTitle>Карта Здоровья</VisualTitle>
              <VisualDescription>
                Присоединяйтесь к сообществу и помогайте создавать карту здоровых
                мест в вашем городе
              </VisualDescription>

              <FeaturesList>
                {features.map((feature, index) => (
                  <FeatureItem
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  >
                    <FeatureIcon>{feature.icon}</FeatureIcon>
                    <span>{feature.text}</span>
                  </FeatureItem>
                ))}
              </FeaturesList>
            </VisualCard>
          </VisualSection>
        </LoginContainer>
      </Container>
    </LoginWrapper>
  );
};
