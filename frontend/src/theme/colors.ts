/**
 * Цветовая палитра для приложения "Карта здоровья"
 * Яркая, современная палитра с градиентами для привлечения внимания на хакатоне
 */

export const colors = {
  // Основные цвета
  primary: {
    main: '#00D9A5', // Яркий бирюзовый
    light: '#33E1B8',
    dark: '#00B88A',
    gradient: 'linear-gradient(135deg, #00D9A5 0%, #00B8E6 100%)',
  },
  
  secondary: {
    main: '#6366F1', // Индиго
    light: '#818CF8',
    dark: '#4F46E5',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  },
  
  // Акцентные цвета
  accent: {
    success: '#10B981', // Зеленый
    warning: '#F59E0B', // Оранжевый
    error: '#EF4444', // Красный
    info: '#3B82F6', // Синий
  },
  
  // Фон
  background: {
    main: '#0F172A', // Темно-синий
    card: 'rgba(15, 23, 42, 0.8)', // Полупрозрачный для glassmorphism
    cardHover: 'rgba(15, 23, 42, 0.95)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  
  // Текст
  text: {
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    muted: '#94A3B8',
    inverse: '#0F172A',
  },
  
  // Границы
  border: {
    main: 'rgba(255, 255, 255, 0.1)',
    light: 'rgba(255, 255, 255, 0.05)',
    accent: 'rgba(0, 217, 165, 0.3)',
  },
  
  // Игровые элементы
  game: {
    level: '#F59E0B',
    points: '#00D9A5',
    reputation: '#6366F1',
    achievement: '#8B5CF6',
  },
  
  // Редкость достижений
  rarity: {
    common: '#94A3B8',
    rare: '#3B82F6',
    epic: '#8B5CF6',
    legendary: '#F59E0B',
  },
};

