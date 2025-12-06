import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/auth/Input';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

const RegisterWrapper = styled.div`
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing['2xl']} 0;
  width: 100%;
`;

const RegisterContainer = styled.div`
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

const RegisterCard = styled(Card)`
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

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ErrorMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.error};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.accent.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const PasswordHint = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: ${({ theme }) => theme.spacing.xs};
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

const BenefitsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const BenefitCard = styled(motion.div)`
  padding: ${({ theme }) => theme.spacing.lg};
  background: rgba(0, 217, 165, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.border.accent};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  text-align: center;
`;

const BenefitIcon = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const BenefitTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const BenefitDescription = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const FloatingIcon = styled(motion.div)`
  position: absolute;
  font-size: ${({ theme }) => theme.typography.fontSize['6xl']};
  opacity: 0.1;
  pointer-events: none;
`;

const benefits = [
  {
    icon: '🚀',
    title: 'Быстрый старт',
    description: 'Начните сразу после регистрации',
  },
  {
    icon: '💎',
    title: 'Эксклюзив',
    description: 'Доступ к уникальным функциям',
  },
  {
    icon: '🎮',
    title: 'Геймификация',
    description: 'Зарабатывайте баллы и достижения',
  },
  {
    icon: '👥',
    title: 'Сообщество',
    description: 'Присоединяйтесь к активным пользователям',
  },
];

export const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Если уже авторизован, редиректим
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Очищаем ошибку для этого поля
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = 'Пароли не совпадают';
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Пароль должен содержать минимум 8 символов';
    }

    if (!formData.email.includes('@')) {
      newErrors.email = 'Введите корректный email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      navigate('/', { replace: true });
    } catch (err: any) {
      if (err.response?.data) {
        const data = err.response.data;
        // Обработка ошибок валидации
        if (typeof data === 'object') {
          const fieldErrors: Record<string, string> = {};
          Object.keys(data).forEach((key) => {
            if (Array.isArray(data[key])) {
              fieldErrors[key] = data[key][0];
            } else if (typeof data[key] === 'string') {
              fieldErrors[key] = data[key];
            }
          });
          setErrors(fieldErrors);
        } else {
          setError(data.detail || data.message || 'Ошибка регистрации');
        }
      } else {
        setError('Ошибка регистрации. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.username &&
    formData.email &&
    formData.password &&
    formData.password_confirm &&
    formData.password === formData.password_confirm;

  return (
    <RegisterWrapper>
      <Container style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <RegisterContainer>
          <FormSection
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <RegisterCard glow>
              <Title
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Создать аккаунт
              </Title>
              <Subtitle>Присоединяйтесь к сообществу Карты Здоровья</Subtitle>

              <Form onSubmit={handleSubmit}>
                {error && <ErrorMessage>{error}</ErrorMessage>}

                <Input
                  label="Имя пользователя *"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  error={errors.username}
                  placeholder="Введите имя пользователя"
                />

                <Input
                  label="Email *"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  error={errors.email}
                  placeholder="example@email.com"
                />

                <FormRow>
                  <Input
                    label="Имя"
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Имя"
                  />
                  <Input
                    label="Фамилия"
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Фамилия"
                  />
                </FormRow>

                <Input
                  label="Пароль *"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  error={errors.password}
                  placeholder="Минимум 8 символов"
                />
                {!errors.password && formData.password && (
                  <PasswordHint>
                    Пароль должен содержать минимум 8 символов
                  </PasswordHint>
                )}

                <Input
                  label="Подтверждение пароля *"
                  type="password"
                  name="password_confirm"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  required
                  error={errors.password_confirm}
                  placeholder="Повторите пароль"
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={loading || !isFormValid}
                >
                  {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </Button>
              </Form>

              <LinkWrapper>
                Уже есть аккаунт? <StyledLink to="/login">Войти</StyledLink>
              </LinkWrapper>
            </RegisterCard>
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
                🎁
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
                ⚡
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
                🌟
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
                🎯
              </FloatingIcon>

              <VisualTitle>Начните прямо сейчас!</VisualTitle>
              <VisualDescription>
                Регистрация займет всего минуту, а вы получите доступ ко всем
                возможностям платформы
              </VisualDescription>

              <BenefitsGrid>
                {benefits.map((benefit, index) => (
                  <BenefitCard
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <BenefitIcon>{benefit.icon}</BenefitIcon>
                    <BenefitTitle>{benefit.title}</BenefitTitle>
                    <BenefitDescription>{benefit.description}</BenefitDescription>
                  </BenefitCard>
                ))}
              </BenefitsGrid>
            </VisualCard>
          </VisualSection>
        </RegisterContainer>
      </Container>
    </RegisterWrapper>
  );
};
