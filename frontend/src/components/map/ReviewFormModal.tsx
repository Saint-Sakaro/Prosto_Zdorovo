import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { POIDetails } from '../../api/maps';
import { ReviewForm } from '../reviews/ReviewForm';
import { theme } from '../../theme';

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.lg};
  overflow-y: auto;
`;

const ModalContent = styled(motion.div)`
  max-width: 600px;
  width: 100%;
  position: relative;
  margin: ${({ theme }) => theme.spacing.xl} 0;
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md};
  right: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.card};
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.cardHover};
    border-color: ${({ theme }) => theme.colors.primary.main};
  }
`;

interface ReviewFormModalProps {
  poi: POIDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    review_type: 'poi_review' | 'incident';
    latitude: number;
    longitude: number;
    category: string;
    content: string;
    has_media: boolean;
    poi?: string;          // UUID POI (если известен)
  }) => Promise<void>;
}

export const ReviewFormModal: React.FC<ReviewFormModalProps> = ({
  poi,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!poi) return null;


  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <ModalContent
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            <CloseButton onClick={onClose} aria-label="Закрыть">
              ×
            </CloseButton>
            <ReviewForm
              onSubmit={onSubmit}
              onCancel={onClose}
              initialData={{
                latitude: poi.latitude,
                longitude: poi.longitude,
                poi: poi.uuid, // ⬅️ Передаем UUID POI
              }}
              initialCategory={poi.category?.name || 'Другое'}
              initialReviewType="poi_review"
            />
          </ModalContent>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

