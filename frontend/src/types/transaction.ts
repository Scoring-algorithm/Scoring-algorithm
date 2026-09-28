export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'review';

export interface Factor {
  name: string;
  weight: number;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  channel: 'card' | 'sbp' | 'transfer';
  merchant: string;
  createdAt: string;
  status: TransactionStatus;
  score: number;
  factors: Factor[];
  explanation: string;
}