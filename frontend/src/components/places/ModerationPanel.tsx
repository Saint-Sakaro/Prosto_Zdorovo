/**
 * Компонент для модерации заявок
 * Этап 3: Модерация заявок (для модераторов)
 * Доступен только модераторам
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../auth/Input';
import { Select } from '../common/Select';
import { PlaceSubmission } from '../../api/places';
import { theme } from '../../theme';

interface ModerationPanelProps {
  submission: PlaceSubmission;
  onModerate: (action: 'approve' | 'reject' | 'request_changes', comment: string) => Promise<void>;
  onClose?: () => void;
}

const PanelContainer = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  max-width: 800px;
  margin: 0 auto;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding-bottom: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.main};
`;

const PanelTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Section = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LLMVerdictCard = styled(Card)<{ $verdict: string }>`
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  background: ${({ $verdict, theme }) =>
    $verdict === 'approve'
      ? `${theme.colors.accent.success}10`
      : $verdict === 'reject'
      ? `${theme.colors.accent.error}10`
      : `${theme.colors.accent.warning}10`};
  border: 2px solid
    ${({ $verdict, theme }) =>
      $verdict === 'approve'
        ? theme.colors.accent.success
        : $verdict === 'reject'
        ? theme.colors.accent.error
        : theme.colors.accent.warning};
`;

const VerdictHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const VerdictTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ConfidenceBadge = styled.div`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background.card};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`;

const VerdictComment = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: ${({ theme }) => theme.spacing.md} 0;
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const AnalysisGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const AnalysisItem = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background.main};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const AnalysisLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const AnalysisValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const FormDataContainer = styled(Card)`
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.main};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FormDataItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: ${({ theme }) => theme.spacing.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.main};
  
  &:last-child {
    border-bottom: none;
  }
`;

const FormDataKey = styled.div`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  flex: 1;
`;

const FormDataValue = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  flex: 2;
  text-align: right;
`;

const ModerationForm = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xl};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 2px solid ${({ theme }) => theme.colors.border.main};
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-family: ${({ theme }) => theme.typography.fontFamily.main};
  min-height: 120px;
  resize: vertical;
  transition: all 0.2s ease;
  margin-bottom: ${({ theme }) => theme.spacing.md};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
    box-shadow: ${({ theme }) => theme.shadows.glow};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const getVerdictLabel = (verdict: string): string => {
  const labels: Record<string, string> = {
    approve: 'Одобрить',
    reject: 'Отклонить',
    request_changes: 'Запросить изменения',
  };
  return labels[verdict] || verdict;
};

export const ModerationPanel: React.FC<ModerationPanelProps> = ({
  submission,
  onModerate,
  onClose,
}) => {
  const [action, setAction] = useState<'approve' | 'reject' | 'request_changes'>('approve');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim() && action !== 'approve') {
      // Для approve комментарий не обязателен
      return;
    }

    setSubmitting(true);
    try {
      await onModerate(action, comment.trim());
      setComment('');
    } catch (error) {
      // Ошибка обрабатывается в родительском компоненте
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PanelContainer>
      {onClose && (
        <PanelHeader>
          <PanelTitle>Модерация заявки</PanelTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </PanelHeader>
      )}

      {/* Данные заявки */}
      <Section>
        <SectionTitle>Информация о заявке</SectionTitle>
        <InfoRow>
          <span>📝</span>
          <span>
            <strong>Название:</strong> {submission.name}
          </span>
        </InfoRow>
        <InfoRow>
          <span>📍</span>
          <span>
            <strong>Адрес:</strong> {submission.address}
          </span>
        </InfoRow>
        <InfoRow>
          <span>🏷️</span>
          <span>
            <strong>Категория:</strong>{' '}
            {submission.category?.name || 'Без категории'}
          </span>
        </InfoRow>
        <InfoRow>
          <span>👤</span>
          <span>
            <strong>Создал:</strong> {submission.submitted_by?.username || 'Неизвестно'}
          </span>
        </InfoRow>
        <InfoRow>
          <span>📅</span>
          <span>
            <strong>Дата создания:</strong>{' '}
            {new Date(submission.created_at).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </InfoRow>
        {submission.description && (
          <InfoRow>
            <span>📄</span>
            <span>
              <strong>Описание:</strong> {submission.description}
            </span>
          </InfoRow>
        )}
      </Section>

      {/* Вердикт LLM */}
      {submission.llm_verdict && (
        <LLMVerdictCard $verdict={submission.llm_verdict.verdict}>
          <VerdictHeader>
            <VerdictTitle>
              🤖 Вердикт LLM: {getVerdictLabel(submission.llm_verdict.verdict)}
            </VerdictTitle>
            <ConfidenceBadge>
              {Math.round(submission.llm_verdict.confidence * 100)}% уверенности
            </ConfidenceBadge>
          </VerdictHeader>
          {submission.llm_verdict.comment && (
            <VerdictComment>{submission.llm_verdict.comment}</VerdictComment>
          )}
          {submission.llm_verdict.analysis && (
            <AnalysisGrid>
              <AnalysisItem>
                <AnalysisLabel>Качество полей</AnalysisLabel>
                <AnalysisValue>
                  {submission.llm_verdict.analysis.field_quality}
                </AnalysisValue>
              </AnalysisItem>
              <AnalysisItem>
                <AnalysisLabel>Влияние на здоровье</AnalysisLabel>
                <AnalysisValue>
                  {submission.llm_verdict.analysis.health_impact}
                </AnalysisValue>
              </AnalysisItem>
              <AnalysisItem>
                <AnalysisLabel>Полнота данных</AnalysisLabel>
                <AnalysisValue>
                  {Math.round(submission.llm_verdict.analysis.data_completeness * 100)}%
                </AnalysisValue>
              </AnalysisItem>
            </AnalysisGrid>
          )}
        </LLMVerdictCard>
      )}

      {/* Заполненные данные формы */}
      {submission.form_data && Object.keys(submission.form_data).length > 0 && (
        <Section>
          <SectionTitle>Заполненные данные</SectionTitle>
          <FormDataContainer>
            {Object.entries(submission.form_data).map(([key, value]) => (
              <FormDataItem key={key}>
                <FormDataKey>{key}:</FormDataKey>
                <FormDataValue>
                  {typeof value === 'boolean'
                    ? value
                      ? '✅ Да'
                      : '❌ Нет'
                    : typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value)}
                </FormDataValue>
              </FormDataItem>
            ))}
          </FormDataContainer>
        </Section>
      )}

      {/* Форма модерации */}
      <ModerationForm>
        <SectionTitle>Решение модератора</SectionTitle>
        <Select
          label="Действие"
          value={action}
          onChange={(value) => setAction(value as any)}
          options={[
            { value: 'approve', label: '✅ Одобрить' },
            { value: 'reject', label: '❌ Отклонить' },
            { value: 'request_changes', label: '⚠️ Запросить изменения' },
          ]}
          required
        />
        <div>
          <label
            style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.text.secondary,
              marginBottom: theme.spacing.xs,
            }}
          >
            Комментарий {action !== 'approve' && '*'}
          </label>
          <TextArea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              action === 'approve'
                ? 'Комментарий (необязательно)'
                : action === 'reject'
                ? 'Укажите причину отклонения'
                : 'Укажите, какие изменения требуются'
            }
            required={action !== 'approve'}
          />
        </div>
        <ButtonsRow>
          {onClose && (
            <Button variant="outline" onClick={onClose} fullWidth>
              Отмена
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSubmit}
            fullWidth
            disabled={submitting || (!comment.trim() && action !== 'approve')}
          >
            {submitting ? 'Применение...' : 'Применить решение'}
          </Button>
        </ButtonsRow>
      </ModerationForm>
    </PanelContainer>
  );
};

