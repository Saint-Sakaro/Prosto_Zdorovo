/**
 * Глобальные стили приложения
 */

import { createGlobalStyle } from 'styled-components';
import { theme } from '../theme';

export const GlobalStyles = createGlobalStyle`

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    scroll-behavior: smooth;
  }

  body {
    font-family: ${theme.typography.fontFamily.main};
    font-size: ${theme.typography.fontSize.base};
    font-weight: ${theme.typography.fontWeight.normal};
    line-height: ${theme.typography.lineHeight.normal};
    color: ${theme.colors.text.primary};
    background: ${theme.colors.background.main};
    background-image: 
      radial-gradient(at 0% 0%, rgba(0, 217, 165, 0.1) 0px, transparent 50%),
      radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.1) 0px, transparent 50%),
      radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.1) 0px, transparent 50%),
      radial-gradient(at 0% 100%, rgba(0, 184, 230, 0.1) 0px, transparent 50%);
    background-attachment: fixed;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }

  #root {
    min-height: 100vh;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${theme.typography.fontFamily.heading};
    font-weight: ${theme.typography.fontWeight.bold};
    line-height: ${theme.typography.lineHeight.tight};
    color: ${theme.colors.text.primary};
  }

  a {
    color: ${theme.colors.primary.main};
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: ${theme.colors.primary.light};
    }
  }

  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    outline: none;
    transition: all 0.2s ease;
  }

  input, textarea, select {
    font-family: inherit;
    outline: none;
  }

  /* Скроллбар */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: ${theme.colors.background.main};
  }

  ::-webkit-scrollbar-thumb {
    background: ${theme.colors.primary.main};
    border-radius: ${theme.borderRadius.full};
    
    &:hover {
      background: ${theme.colors.primary.light};
    }
  }

  /* Выделение текста */
  ::selection {
    background: ${theme.colors.primary.main};
    color: ${theme.colors.text.inverse};
  }
`;

