import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { LeaderboardEntry } from '../../api/gamification';
import { theme } from '../../theme';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  type: 'global' | 'monthly';
  currentUserPosition?: number;
  currentUserUuid?: string | null;
}

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 ${({ theme }) => theme.spacing.sm};
`;

const TableRow = styled(motion.tr)<{ isCurrentUser?: boolean; rank: number }>`
  background: ${({ theme, isCurrentUser }) =>
    isCurrentUser
      ? 'rgba(0, 217, 165, 0.1)'
      : theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid
    ${({ theme, isCurrentUser }) =>
      isCurrentUser ? theme.colors.primary.main : theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    transform: translateX(4px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
    border-color: ${({ theme }) => theme.colors.primary.main};
  }

  ${({ rank, theme }) => {
    if (rank === 1) {
      return `
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.05) 100%);
        border-color: #FFD700;
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
      `;
    }
    if (rank === 2) {
      return `
        background: linear-gradient(135deg, rgba(192, 192, 192, 0.2) 0%, rgba(192, 192, 192, 0.05) 100%);
        border-color: #C0C0C0;
        box-shadow: 0 0 20px rgba(192, 192, 192, 0.3);
      `;
    }
    if (rank === 3) {
      return `
        background: linear-gradient(135deg, rgba(205, 127, 50, 0.2) 0%, rgba(205, 127, 50, 0.05) 100%);
        border-color: #CD7F32;
        box-shadow: 0 0 20px rgba(205, 127, 50, 0.3);
      `;
    }
    return '';
  }}
`;

const TableCell = styled.td`
  padding: ${({ theme }) => theme.spacing.md};
  text-align: left;
  vertical-align: middle;
`;

const RankCell = styled(TableCell)<{ rank: number }>`
  text-align: center;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  width: 80px;

  ${({ rank, theme }) => {
    if (rank === 1) {
      return `
        color: #FFD700;
        font-size: ${theme.typography.fontSize['2xl']};
      `;
    }
    if (rank === 2) {
      return `
        color: #C0C0C0;
        font-size: ${theme.typography.fontSize.xl};
      `;
    }
    if (rank === 3) {
      return `
        color: #CD7F32;
        font-size: ${theme.typography.fontSize.xl};
      `;
    }
    return `color: ${theme.colors.text.secondary};`;
  }}
`;

const UserCell = styled(TableCell)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Avatar = styled.div<{ rank: number }>`
  width: 50px;
  height: 50px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ theme }) => theme.colors.primary.gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.inverse};
  box-shadow: ${({ theme }) => theme.shadows.md};
  position: relative;
  overflow: hidden;

  ${({ rank }) => {
    if (rank === 1) {
      return `
        width: 60px;
        height: 60px;
        border: 3px solid #FFD700;
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
      `;
    }
    if (rank === 2) {
      return `
        width: 55px;
        height: 55px;
        border: 2px solid #C0C0C0;
        box-shadow: 0 0 15px rgba(192, 192, 192, 0.4);
      `;
    }
    if (rank === 3) {
      return `
        width: 55px;
        height: 55px;
        border: 2px solid #CD7F32;
        box-shadow: 0 0 15px rgba(205, 127, 50, 0.4);
      `;
    }
    return '';
  }}

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.3) 0%,
      transparent 70%
    );
    animation: rotate 3s linear infinite;
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  position: relative;
  z-index: 1;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Username = styled.div<{ isCurrentUser?: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme, isCurrentUser }) =>
    isCurrentUser
      ? theme.typography.fontWeight.bold
      : theme.typography.fontWeight.semibold};
  color: ${({ theme, isCurrentUser }) =>
    isCurrentUser ? theme.colors.primary.main : theme.colors.text.primary};
`;

const UserLevel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const StatCell = styled(TableCell)`
  text-align: right;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ReputationValue = styled.span<{ type: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  background: ${({ type, theme }) =>
    type === 'global'
      ? theme.colors.game.reputation
      : theme.colors.secondary.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const MedalIcon = styled.span<{ rank: number }>`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  ${({ rank }) => {
    if (rank === 1) return 'content: "🥇";';
    if (rank === 2) return 'content: "🥈";';
    if (rank === 3) return 'content: "🥉";';
    return '';
  }}
`;

const getInitials = (username: string): string => {
  return username
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  type,
  currentUserPosition,
  currentUserUuid,
}) => {
  return (
    <TableWrapper>
      <Table>
        <thead>
          <tr>
            <th style={{ width: '80px', textAlign: 'center' }}>Место</th>
            <th>Пользователь</th>
            <th style={{ textAlign: 'right' }}>
              {type === 'global' ? 'Общий рейтинг' : 'Месячный рейтинг'}
            </th>
            <th style={{ textAlign: 'right' }}>Уровень</th>
            <th style={{ textAlign: 'right' }}>Отзывов</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            // Сравниваем по UUID, так как rank может отличаться на разных страницах
            const isCurrentUser = Boolean(currentUserUuid && entry.user_uuid === currentUserUuid);
            return (
              <TableRow
                key={entry.user_uuid || index}
                rank={entry.rank}
                isCurrentUser={isCurrentUser}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <RankCell rank={entry.rank}>
                  {entry.rank <= 3 ? (
                    <MedalIcon rank={entry.rank} />
                  ) : (
                    entry.rank
                  )}
                </RankCell>
                <UserCell>
                  <Avatar rank={entry.rank}>
                    {entry.avatar_url ? (
                      <AvatarImage src={entry.avatar_url} alt={entry.username} />
                    ) : (
                      <span style={{ position: 'relative', zIndex: 1 }}>
                        {getInitials(entry.username)}
                      </span>
                    )}
                  </Avatar>
                  <UserInfo>
                    <Username isCurrentUser={isCurrentUser}>
                      {entry.username}
                      {isCurrentUser && ' (Вы)'}
                    </Username>
                    <UserLevel>Уровень {entry.level}</UserLevel>
                  </UserInfo>
                </UserCell>
                <StatCell>
                  <ReputationValue type={type}>
                    {type === 'global'
                      ? entry.total_reputation.toLocaleString()
                      : entry.monthly_reputation.toLocaleString()}
                  </ReputationValue>
                </StatCell>
                <StatCell>{entry.level}</StatCell>
                <StatCell>{entry.unique_reviews_count}</StatCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>
    </TableWrapper>
  );
};

