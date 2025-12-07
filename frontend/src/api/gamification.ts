/**
 * API методы для модуля геймификации
 */

import apiClient from './client';

// Типы данных
export interface UserProfile {
  id?: number;
  uuid: string;
  username: string;
  email: string;
  total_reputation: number;
  monthly_reputation: number;
  points_balance: number;
  level: number;
  experience: number;
  unique_reviews_count: number;
  is_banned: boolean;
  banned_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  uuid: string;
  author: number;
  author_username: string;
  review_type: 'poi_review' | 'incident';
  latitude: number;
  longitude: number;
  category: string;
  content: string;
  has_media: boolean;
  is_unique: boolean;
  moderation_status: 'pending' | 'approved' | 'soft_reject' | 'spam_blocked';
  moderated_by: number | null;
  moderated_by_username: string | null;
  moderated_at: string | null;
  moderation_comment: string;
  created_at: string;
  updated_at: string;
  // ⬇️ НОВЫЕ ПОЛЯ
  rating?: number | null;              // Оценка отзыва (1-5)
  poi?: string | null;                 // UUID POI (если есть связь)
  sentiment_score?: number | null;     // Сентимент от LLM (-1 до 1)
  extracted_facts?: Record<string, any>; // Извлеченные факты от LLM
}

export interface LeaderboardEntry {
  rank: number;
  user_uuid: string;
  username: string;
  total_reputation: number;
  monthly_reputation: number;
  level: number;
  unique_reviews_count: number;
  avatar_url?: string | null;
}

export interface Reward {
  id?: number;
  uuid: string;
  name: string;
  description: string;
  reward_type: 'coupon' | 'digital_merch' | 'physical_merch' | 'privilege';
  points_cost: number;
  image: string | null;
  is_available: boolean;
  stock_quantity: number | null;
  sold_quantity: number;
  partner_name: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Achievement {
  uuid: string;
  name: string;
  description: string;
  icon: string | null;
  condition: string;
  bonus_points: number;
  bonus_reputation: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  created_at: string;
}

export interface UserAchievement {
  uuid: string;
  user: number;
  user_username: string;
  achievement: number;
  achievement_name: string;
  achievement_icon: string | null;
  achievement_rarity: 'common' | 'rare' | 'epic' | 'legendary';
  progress: number;
  created_at: string;
}

export interface RewardTransaction {
  uuid: string;
  user: number;
  user_username: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  reason: string;
  review: number | null;
  review_uuid: string | null;
  balance_after: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface UserReward {
  uuid: string;
  user: number;
  user_username: string;
  reward: number;
  reward_name: string;
  reward_image: string | null;
  status: 'active' | 'used' | 'expired';
  used_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// API методы

export const gamificationApi = {
  // Профиль пользователя
  getMyProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get('/gamification/profiles/me/');
    return response.data;
  },

  getProfile: async (id: number): Promise<UserProfile> => {
    const response = await apiClient.get(`/gamification/profiles/${id}/`);
    return response.data;
  },

  getProfileAchievements: async (id: number) => {
    const response = await apiClient.get(`/gamification/profiles/${id}/achievements/`);
    return response.data;
  },

  getMyAchievements: async () => {
    const profile = await gamificationApi.getMyProfile();
    const response = await apiClient.get(`/gamification/profiles/${profile.id || 0}/achievements/`);
    return response.data;
  },

  getProfileTransactions: async (id: number, limit = 20, offset = 0) => {
    const response = await apiClient.get(`/gamification/profiles/${id}/transactions/`, {
      params: { limit, offset },
    });
    return response.data;
  },

  getMyTransactions: async (limit = 20, offset = 0) => {
    const profile = await gamificationApi.getMyProfile();
    const response = await apiClient.get(`/gamification/profiles/${profile.id || 0}/transactions/`, {
      params: { limit, offset },
    });
    return response.data;
  },

  // Отзывы
  createReview: async (reviewData: {
    review_type: 'poi_review' | 'incident';
    latitude: number;
    longitude: number;
    category: string;
    content: string;
    has_media: boolean;
    // ⬇️ НОВЫЕ ОПЦИОНАЛЬНЫЕ ПОЛЯ
    rating?: number;        // Оценка 1-5 (для poi_review)
    poi?: string;          // UUID POI (если известен)
  }): Promise<Review> => {
    const response = await apiClient.post('/gamification/reviews/', reviewData);
    return response.data;
  },

  getReviews: async (params?: {
    limit?: number;
    offset?: number;
    review_type?: string;
    moderation_status?: string;
  }): Promise<{ count: number; results: Review[] }> => {
    const response = await apiClient.get('/gamification/reviews/', { params });
    return response.data;
  },

  getReview: async (id: number): Promise<Review> => {
    const response = await apiClient.get(`/gamification/reviews/${id}/`);
    return response.data;
  },

  moderateReview: async (
    id: number | string,
    action: 'approve' | 'soft_reject' | 'spam_block',
    comment?: string
  ): Promise<Review> => {
    const response = await apiClient.post(`/gamification/reviews/${id}/moderate/`, {
      action,
      comment,
    });
    return response.data;
  },

  getPendingReviews: async (filters?: {
    review_type?: string;
    has_media?: boolean;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ count: number; results: Review[] }> => {
    const response = await apiClient.get('/gamification/reviews/pending/', {
      params: filters,
    });
    return response.data;
  },

  // Таблицы лидеров
  getGlobalLeaderboard: async (params?: {
    limit?: number;
    offset?: number;
    region?: string;
  }): Promise<{ count: number; results: LeaderboardEntry[] }> => {
    const response = await apiClient.get('/gamification/leaderboard/global/', { params });
    return response.data;
  },

  getMonthlyLeaderboard: async (params?: {
    month?: number;
    year?: number;
    limit?: number;
    offset?: number;
    region?: string;
  }): Promise<{ count: number; results: LeaderboardEntry[] }> => {
    const response = await apiClient.get('/gamification/leaderboard/monthly/', { params });
    return response.data;
  },

  getMyPosition: async (type: 'global' | 'monthly' = 'global'): Promise<{
    position: number;
    leaderboard_type: string;
  }> => {
    const response = await apiClient.get('/gamification/leaderboard/my-position/', {
      params: { type },
    });
    return response.data;
  },

  // Награды
  getRewards: async (): Promise<Reward[]> => {
    const response = await apiClient.get('/gamification/rewards/');
    // API может возвращать объект с results или массив напрямую
    return Array.isArray(response.data) ? response.data : (response.data.results || []);
  },

  getReward: async (id: number): Promise<Reward> => {
    const response = await apiClient.get(`/gamification/rewards/${id}/`);
    return response.data;
  },

  purchaseReward: async (id: number | string): Promise<UserReward> => {
    const response = await apiClient.post(`/gamification/rewards/${id}/purchase/`);
    return response.data;
  },

  getMyRewards: async () => {
    const response = await apiClient.get('/gamification/my-rewards/');
    return response.data;
  },

  useReward: async (id: number) => {
    const response = await apiClient.post(`/gamification/my-rewards/${id}/use/`);
    return response.data;
  },

  // Достижения
  getAchievements: async (): Promise<Achievement[]> => {
    const response = await apiClient.get('/gamification/achievements/');
    return response.data;
  },

  getAchievement: async (id: number): Promise<Achievement> => {
    const response = await apiClient.get(`/gamification/achievements/${id}/`);
    return response.data;
  },
};

