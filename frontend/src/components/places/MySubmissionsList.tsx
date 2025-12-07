/**
 * Компонент для отображения списка заявок пользователя
 * Этап 2: Страница моих заявок
 */

import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { PlaceSubmission } from '../../api/places';
import { theme } from '../../theme';

interface MySubmissionsListProps {
  submissions: PlaceSubmission[];
  onSubmissionClick?: (submission: PlaceSubmission) => void;
}

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const SubmissionCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg};
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.xl};
  }
`;

const SubmissionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  gap: ${({ theme }) => theme.spacing.md};
`;

const SubmissionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  flex: 1;
`;

const StatusBadge = styled.div.withConfig({
  shouldForwardProp: (prop) => !['$status'].includes(prop),
})<{ $status: string }>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;

  ${({ $status, theme }) => {
    switch ($status) {
      case 'approved':
        return `
          background: ${theme.colors.accent.success}20;
          color: ${theme.colors.accent.success};
          border: 1px solid ${theme.colors.accent.success};
        `;
      case 'pending':
        return `
          background: ${theme.colors.accent.warning}20;
          color: ${theme.colors.accent.warning};
          border: 1px solid ${theme.colors.accent.warning};
        `;
      case 'rejected':
        return `
          background: ${theme.colors.accent.error}20;
          color: ${theme.colors.accent.error};
          border: 1px solid ${theme.colors.accent.error};
        `;
      case 'changes_requested':
        return `
          background: ${theme.colors.accent.warning}30;
          color: ${theme.colors.accent.warning};
          border: 1px solid ${theme.colors.accent.warning};
        `;
      default:
        return `
          background: ${theme.colors.text.muted}20;
          color: ${theme.colors.text.muted};
          border: 1px solid ${theme.colors.text.muted};
        `;
    }
  }}
`;

const SubmissionInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LLMVerdictCard = styled.div<{ $verdict: string }>`
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  margin-top: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  background: ${({ $verdict, theme }) =>
    $verdict === 'approve'
      ? `${theme.colors.accent.success}10`
      : $verdict === 'reject'
      ? `${theme.colors.accent.error}10`
      : `${theme.colors.accent.warning}10`};
`;

const VerdictHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const VerdictTitle = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ConfidenceBadge = styled.span`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background.card};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const VerdictComment = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: ${({ theme }) => theme.spacing.xs} 0 0 0;
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const SubmissionFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.md};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border.main};
`;

const DateText = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const EmptyState = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const EmptyStateTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const EmptyStateText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'На модерации',
    approved: 'Одобрено',
    rejected: 'Отклонено',
    changes_requested: 'Требуются изменения',
  };
  return labels[status] || status;
};

export const MySubmissionsList: React.FC<MySubmissionsListProps> = ({
  submissions,
  onSubmissionClick,
}) => {
  if (submissions.length === 0) {
    return (
      <EmptyState>
        <EmptyStateTitle>У вас пока нет заявок</EmptyStateTitle>
        <EmptyStateText>
          Создайте первую заявку на добавление места на карту здоровья
        </EmptyStateText>
        <Button variant="primary" to="/places/create">
          Создать заявку
        </Button>
      </EmptyState>
    );
  }

  return (
    <ListContainer>
      {submissions.map((submission) => (
        <motion.div
          key={submission.uuid}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <SubmissionCard
            onClick={() => onSubmissionClick?.(submission)}
            hover={!!onSubmissionClick}
          >
            <SubmissionHeader>
              <SubmissionTitle>{submission.name}</SubmissionTitle>
              <StatusBadge $status={submission.moderation_status}>
                {getStatusLabel(submission.moderation_status)}
              </StatusBadge>
            </SubmissionHeader>

            <SubmissionInfo>
              <InfoRow>
                <span>📍</span>
                <span>{submission.address}</span>
              </InfoRow>
              <InfoRow>
                <span>🏷️</span>
                <span>{submission.category?.name || 'Без категории'}</span>
              </InfoRow>
            </SubmissionInfo>

            {submission.llm_verdict && (
              <LLMVerdictCard $verdict={submission.llm_verdict.verdict}>
                <VerdictHeader>
                  <VerdictTitle>
                    Вердикт LLM:{' '}
                    {submission.llm_verdict.verdict === 'approve'
                      ? 'Одобрить'
                      : submission.llm_verdict.verdict === 'reject'
                      ? 'Отклонить'
                      : 'Запросить изменения'}
                  </VerdictTitle>
                  <ConfidenceBadge>
                    {Math.round(submission.llm_verdict.confidence * 100)}% уверенности
                  </ConfidenceBadge>
                </VerdictHeader>
                {submission.llm_verdict.comment && (
                  <VerdictComment>{submission.llm_verdict.comment}</VerdictComment>
                )}
                {submission.llm_verdict.analysis && (
                  <div style={{ marginTop: theme.spacing.sm }}>
                    <InfoRow>
                      <span>📊</span>
                      <span>
                        Качество полей: {submission.llm_verdict.analysis.field_quality}
                      </span>
                    </InfoRow>
                    <InfoRow>
                      <span>💚</span>
                      <span>
                        Влияние на здоровье: {submission.llm_verdict.analysis.health_impact}
                      </span>
                    </InfoRow>
                    <InfoRow>
                      <span>📋</span>
                      <span>
                        Полнота данных:{' '}
                        {Math.round(submission.llm_verdict.analysis.data_completeness * 100)}%
                      </span>
                    </InfoRow>
                  </div>
                )}
              </LLMVerdictCard>
            )}

            <SubmissionFooter>
              <DateText>
                Создано: {new Date(submission.created_at).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </DateText>
              <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  to={`/places/submissions/${submission.uuid}`}
                >
                  Детали
                </Button>
              </div>
            </SubmissionFooter>
          </SubmissionCard>
        </motion.div>
      ))}
    </ListContainer>
  );
};

