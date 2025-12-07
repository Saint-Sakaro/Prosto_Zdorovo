import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../theme';
import { Container } from '../common/Container';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { authApi } from '../../api/auth';

const HeaderWrapper = styled(motion.header)`
  position: sticky;
  top: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.main};
  padding: ${({ theme }) => theme.spacing.md} 0;
  width: 100%;
  overflow-x: hidden;
`;

const HeaderContent = styled(Container)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
  flex-wrap: nowrap;
  
  @media (max-width: 1200px) {
    gap: ${({ theme }) => theme.spacing.sm};
  }
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`;

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  background: ${({ theme }) => theme.colors.primary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-decoration: none;
  transition: all 0.3s ease;
  flex-shrink: 0;
  min-width: 0;
  white-space: nowrap;

  @media (max-width: 1200px) {
    font-size: ${({ theme }) => theme.typography.fontSize.xl};
    gap: ${({ theme }) => theme.spacing.xs};
  }
  
  @media (max-width: 768px) {
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
  }
  
  @media (max-width: 480px) {
    span {
      display: none;
    }
  }

  &:hover {
    transform: scale(1.05);
  }
`;

const LogoIcon = styled.img`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  object-fit: cover;
  box-shadow: ${({ theme }) => theme.shadows.glow};
  flex-shrink: 0;
  border: 2px solid ${({ theme }) => theme.colors.primary.main}40;
  
  @media (max-width: 1200px) {
    width: 32px;
    height: 32px;
  }
  
  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
  }
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  flex: 1;
  justify-content: center;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
  
  @media (max-width: 1200px) {
    gap: ${({ theme }) => theme.spacing.xs};
    justify-content: flex-start;
    padding: 0 ${({ theme }) => theme.spacing.xs};
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled(Link).withConfig({
  shouldForwardProp: (prop) => !['active'].includes(prop),
})<{ active?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  color: ${({ active, theme }) =>
    active ? theme.colors.primary.main : theme.colors.text.secondary};
  font-weight: ${({ active, theme }) =>
    active ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.normal};
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all 0.2s ease;
  position: relative;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};

  @media (max-width: 1200px) {
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
  }

  &:hover {
    color: ${({ theme }) => theme.colors.primary.main};
    background: rgba(0, 217, 165, 0.1);
  }

  ${({ active, theme }) =>
    active &&
    `
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60%;
      height: 2px;
      background: ${theme.colors.primary.gradient};
      border-radius: ${theme.borderRadius.full};
    }
  `}
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-shrink: 0;
  min-width: 0;
  
  @media (max-width: 1200px) {
    gap: ${({ theme }) => theme.spacing.xs};
  }
  
  @media (max-width: 480px) {
    gap: ${({ theme }) => theme.spacing.xs};
    
    button {
      padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
      font-size: ${({ theme }) => theme.typography.fontSize.xs};
    }
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: nowrap;
  min-width: 0;
  
  @media (max-width: 1200px) {
    gap: ${({ theme }) => theme.spacing.xs};
  }
`;

const Username = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  
  @media (max-width: 768px) {
    display: none;
  }
`;

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

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
        } catch (error) {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, user?.id]); // Обновляем при смене пользователя

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    // Перезагружаем страницу для полного сброса всех данных
    navigate('/', { replace: true });
    window.location.reload();
  };

  return (
    <HeaderWrapper
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <HeaderContent>
        <Logo to="/">
          <LogoIcon src="/logo.png" alt="Карта Здоровья" />
          <span>Карта Здоровья</span>
        </Logo>

        <Nav>
          <NavLink to="/" active={isActive('/')}>
            Главная
          </NavLink>
          <NavLink to="/leaderboard" active={isActive('/leaderboard')}>
            Лидеры
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/map" active={isActive('/map')}>
                Карта
              </NavLink>
              <NavLink to="/places/create" active={isActive('/places/create')}>
                Создать место
              </NavLink>
              {/* Скрываем эти вкладки для модераторов */}
              {!isAdmin && (
                <>
                  <NavLink to="/places/my-submissions" active={isActive('/places/my-submissions')}>
                    Мои заявки
                  </NavLink>
                  <NavLink to="/rewards" active={isActive('/rewards')}>
                    Награды
                  </NavLink>
                  <NavLink to="/achievements" active={isActive('/achievements')}>
                    Достижения
                  </NavLink>
                </>
              )}
              {isAdmin && (
                <>
                  <NavLink to="/places/moderation" active={isActive('/places/moderation')}>
                    Модерация мест
                  </NavLink>
                  <NavLink to="/moderation" active={isActive('/moderation')}>
                    Модерация отзывов
                  </NavLink>
                  <NavLink to="/places/bulk-upload" active={isActive('/places/bulk-upload')}>
                    Массовая загрузка
                  </NavLink>
                  <NavLink to="/places/categories" active={isActive('/places/categories')}>
                    Категории
                  </NavLink>
                </>
              )}
            </>
          )}
        </Nav>

        <UserSection>
          {isAuthenticated ? (
            <UserInfo>
              <Username>{user?.username}</Username>
              <Button variant="outline" size="sm" to="/profile">
                Профиль
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Выйти
              </Button>
            </UserInfo>
          ) : (
            <>
              <Button variant="ghost" size="sm" to="/login">
                Войти
              </Button>
              <Button variant="outline" size="sm" to="/register">
                Регистрация
              </Button>
            </>
          )}
        </UserSection>
      </HeaderContent>
    </HeaderWrapper>
  );
};

