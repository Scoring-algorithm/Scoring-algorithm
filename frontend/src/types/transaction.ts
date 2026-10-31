// src/types/transaction.ts
export type Decision = 'approve' | 'review' | 'reject';

export interface Feature {
  amount: number;
  amount_ratio: number;
  is_new_device: number;
  tx_count_history: number;
}

export interface Transaction {
  id: number;
  transaction_id: string;
  user_id: string;
  device_id: string | null;
  amount: number;
  currency: string;
  score: number;
  decision: Decision;
  created_at: string;
  features_used?: Feature; // Приходит только при создании
}

export interface Thresholds {
  id: number;
  low_max: number;
  medium_max: number;
}