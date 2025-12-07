/**
 * Модальное окно для отображения деталей заявки
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { getSubmissionDetails, PlaceSubmission } from '../../api/places';
import { theme } from '../../theme';

interface SubmissionDetailsModalProps {
  submissionUuid: string | null;
  onClose: () => void;
}

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const ModalContent = styled(motion.div)`
  background: ${({ theme }) => theme.colors.background.card};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${({ theme }) => theme.shadows.xl};
  position: relative;
`;

const ModalHeader = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.main};
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.colors.background.card};
  z-index: 10;
`;

const ModalTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.sm};
  line-height: 1;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const ModalBody = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Section = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
`;

const InfoLabel = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  min-width: 150px;
`;

const InfoValue = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  flex: 1;
`;

const StatusBadge = styled.div.withConfig({
  shouldForwardProp: (prop) => !['$status'].includes(prop),
})<{ $status: string }>`
  display: inline-block;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.5px;

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

const DescriptionText = styled.p`
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  margin: 0;
`;

const FormDataContainer = styled.div`
  background: ${({ theme }) => theme.colors.background.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const FormDataItem = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const LoadingText = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorText = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.accent.error};
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

export const SubmissionDetailsModal: React.FC<SubmissionDetailsModalProps> = ({
  submissionUuid,
  onClose,
}) => {
  const [submission, setSubmission] = useState<PlaceSubmission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionUuid) {
      setSubmission(null);
      return;
    }

    const loadSubmission = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getSubmissionDetails(submissionUuid);
        setSubmission(data);
      } catch (err: any) {
        console.error('Ошибка загрузки деталей заявки:', err);
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            'Не удалось загрузить детали заявки'
        );
      } finally {
        setLoading(false);
      }
    };

    loadSubmission();
  }, [submissionUuid]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {submissionUuid && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
        >
          <ModalContent
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <ModalTitle>Детали заявки</ModalTitle>
              <CloseButton onClick={onClose}>×</CloseButton>
            </ModalHeader>

            <ModalBody>
              {loading && <LoadingText>Загрузка...</LoadingText>}

              {error && (
                <ErrorText>
                  {error}
                  <div style={{ marginTop: theme.spacing.md }}>
                    <Button variant="outline" onClick={onClose}>
                      Закрыть
                    </Button>
                  </div>
                </ErrorText>
              )}

              {!loading && !error && submission && (
                <>
                  <Section>
                    <SectionTitle>Основная информация</SectionTitle>
                    <InfoRow>
                      <InfoLabel>Название:</InfoLabel>
                      <InfoValue>{submission.name}</InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel>Адрес:</InfoLabel>
                      <InfoValue>{submission.address}</InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel>Координаты:</InfoLabel>
                      <InfoValue>
                        {Number(submission.latitude).toFixed(6)}, {Number(submission.longitude).toFixed(6)}
                      </InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel>Категория:</InfoLabel>
                      <InfoValue>
                        {submission.category?.name || 'Без категории'}
                      </InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel>Статус:</InfoLabel>
                      <InfoValue>
                        <StatusBadge $status={submission.moderation_status}>
                          {getStatusLabel(submission.moderation_status)}
                        </StatusBadge>
                      </InfoValue>
                    </InfoRow>
                  </Section>

                  {submission.description && (
                    <Section>
                      <SectionTitle>Описание</SectionTitle>
                      <DescriptionText>{submission.description}</DescriptionText>
                    </Section>
                  )}

                  {submission.form_data && Object.keys(submission.form_data).length > 0 && (
                    <Section>
                      <SectionTitle>Данные формы</SectionTitle>
                      <FormDataContainer>
                        {Object.entries(submission.form_data).map(([key, value]) => (
                          <FormDataItem key={key}>
                            <InfoRow>
                              <InfoLabel>{key}:</InfoLabel>
                              <InfoValue>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </InfoValue>
                            </InfoRow>
                          </FormDataItem>
                        ))}
                      </FormDataContainer>
                    </Section>
                  )}

                  {submission.llm_verdict && (
                    <Section>
                      <SectionTitle>Вердикт LLM</SectionTitle>
                      <InfoRow>
                        <InfoLabel>Решение:</InfoLabel>
                        <InfoValue>
                          {submission.llm_verdict.verdict === 'approve'
                            ? 'Одобрить'
                            : submission.llm_verdict.verdict === 'reject'
                            ? 'Отклонить'
                            : 'Запросить изменения'}
                        </InfoValue>
                      </InfoRow>
                      <InfoRow>
                        <InfoLabel>Уверенность:</InfoLabel>
                        <InfoValue>
                          {Math.round(submission.llm_verdict.confidence * 100)}%
                        </InfoValue>
                      </InfoRow>
                      {submission.llm_verdict.comment && (
                        <InfoRow>
                          <InfoLabel>Комментарий:</InfoLabel>
                          <InfoValue>{submission.llm_verdict.comment}</InfoValue>
                        </InfoRow>
                      )}
                      {submission.llm_verdict.analysis && (
                        <>
                          <InfoRow>
                            <InfoLabel>Качество полей:</InfoLabel>
                            <InfoValue>
                              {submission.llm_verdict.analysis.field_quality}
                            </InfoValue>
                          </InfoRow>
                          <InfoRow>
                            <InfoLabel>Влияние на здоровье:</InfoLabel>
                            <InfoValue>
                              {submission.llm_verdict.analysis.health_impact}
                            </InfoValue>
                          </InfoRow>
                          <InfoRow>
                            <InfoLabel>Полнота данных:</InfoLabel>
                            <InfoValue>
                              {Math.round(submission.llm_verdict.analysis.data_completeness * 100)}%
                            </InfoValue>
                          </InfoRow>
                        </>
                      )}
                    </Section>
                  )}

                  <Section>
                    <SectionTitle>Дополнительная информация</SectionTitle>
                    <InfoRow>
                      <InfoLabel>Создано:</InfoLabel>
                      <InfoValue>
                        {new Date(submission.created_at).toLocaleString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel>Обновлено:</InfoLabel>
                      <InfoValue>
                        {new Date(submission.updated_at).toLocaleString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </InfoValue>
                    </InfoRow>
                    {submission.submitted_by && (
                      <InfoRow>
                        <InfoLabel>Создал:</InfoLabel>
                        <InfoValue>{submission.submitted_by.username}</InfoValue>
                      </InfoRow>
                    )}
                  </Section>

                  <div style={{ marginTop: theme.spacing.xl, textAlign: 'right' }}>
                    <Button variant="outline" onClick={onClose}>
                      Закрыть
                    </Button>
                  </div>
                </>
              )}
            </ModalBody>
          </ModalContent>
        </Overlay>
      )}
    </AnimatePresence>
  );
};
