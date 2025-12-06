import styled from 'styled-components';
import { theme } from '../../theme';

export const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.lg};

  @media (max-width: 768px) {
    padding: 0 ${({ theme }) => theme.spacing.md};
  }
`;

