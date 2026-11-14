// src/types/transaction.ts
export type Decision = 'approve' | 'review' | 'reject';
export type ReasonType = 'risk' | 'safe' | 'neutral';

export interface Feature {
  amount: number;
  amount_ratio: number;
  is_new_device: number;
  tx_count_history: number;
}

export interface Reason {
  type: ReasonType;
  text: string;
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
  threshold_low: number | null;
  threshold_medium: number | null;
  reasons?: Reason[]; 
  created_at: string;
  features_used?: Feature;
}

export interface Thresholds {
  id: number;
  low_max: number;
  medium_max: number;
}