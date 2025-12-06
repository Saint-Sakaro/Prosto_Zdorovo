import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Reward } from '../../api/gamification';
import { theme } from '../../theme';

interface RewardCardProps {
  reward: Reward;
  userPoints: number;
  onPurchase: (rewardId: string) => void;
  isPurchasing?: boolean;
}

const RewardCardWrapper = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  overflow: hidden;
`;

const RewardImage = styled.div<{ imageUrl?: string }>`
  width: 100%;
  height: 200px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ imageUrl, theme }) =>
    imageUrl
      ? `url(${imageUrl}) center/cover`
      : theme.colors.primary.gradient};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize['6xl']};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${({ theme }) => theme.colors.primary.gradient};
    opacity: 0.3;
  }
`;

const RewardType = styled.div<{ type: string }>`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md};
  right: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid ${({ theme }) => theme.colors.border.main};
  color: ${({ theme }) => theme.colors.text.primary};
  z-index: 1;
`;

const RewardContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const RewardName = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const RewardDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  flex: 1;
`;

const RewardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border.main};
`;

const PriceSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const PriceLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Price = styled.div<{ canAfford: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme, canAfford }) =>
    canAfford ? theme.colors.primary.main : theme.colors.accent.error};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const StockInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const PartnerBadge = styled.div`
  display: inline-block;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.secondary.gradient};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.inverse};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const UnavailableOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  z-index: 10;
`;

const UnavailableText = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  text-align: center;
`;

const typeLabels = {
  coupon: 'Купон',
  digital_merch: 'Цифровой мерч',
  physical_merch: 'Реальный мерч',
  privilege: 'Привилегия',
};

export const RewardCard: React.FC<RewardCardProps> = ({
  reward,
  userPoints,
  onPurchase,
  isPurchasing = false,
}) => {
  const canAfford = userPoints >= reward.points_cost;
  const isAvailable = reward.is_available && (reward.stock_quantity === null || reward.stock_quantity > reward.sold_quantity);

  const handlePurchase = () => {
    if (canAfford && isAvailable && !isPurchasing) {
      onPurchase(reward.uuid);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <RewardCardWrapper hover={isAvailable && canAfford} glow={isAvailable && canAfford}>
        {!isAvailable && (
          <UnavailableOverlay>
            <UnavailableText>Недоступно</UnavailableText>
          </UnavailableOverlay>
        )}

        <RewardImage imageUrl={reward.image || undefined}>
          {!reward.image && <span>🎁</span>}
        </RewardImage>

        <RewardType type={reward.reward_type}>
          {typeLabels[reward.reward_type] || reward.reward_type}
        </RewardType>

        <RewardContent>
          {reward.partner_name && (
            <PartnerBadge>Партнер: {reward.partner_name}</PartnerBadge>
          )}
          <RewardName>{reward.name}</RewardName>
          <RewardDescription>{reward.description}</RewardDescription>

          <RewardFooter>
            <PriceSection>
              <PriceLabel>Стоимость</PriceLabel>
              <Price canAfford={canAfford}>
                <span>💰</span>
                {reward.points_cost.toLocaleString()} баллов
              </Price>
              {reward.stock_quantity !== null && (
                <StockInfo>
                  Осталось: {reward.stock_quantity - reward.sold_quantity}
                </StockInfo>
              )}
            </PriceSection>

            <Button
              variant={canAfford && isAvailable ? 'primary' : 'outline'}
              size="sm"
              onClick={handlePurchase}
              disabled={!canAfford || !isAvailable || isPurchasing}
              fullWidth={false}
            >
              {isPurchasing
                ? 'Покупка...'
                : !canAfford
                ? 'Недостаточно баллов'
                : !isAvailable
                ? 'Недоступно'
                : 'Купить'}
            </Button>
          </RewardFooter>
        </RewardContent>
      </RewardCardWrapper>
    </motion.div>
  );
};

