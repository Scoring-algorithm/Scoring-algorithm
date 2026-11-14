import axios from 'axios';
import type { Transaction, Thresholds } from '../types/transaction';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

export const apiService = {
  async downloadAuditCsv(eventType?: string, userId?: string) {
    const params = new URLSearchParams();
    if (eventType) params.append('event_type', eventType);
    if (userId) params.append('user_id', userId);
    const response = await fetch(`/api/audit/export-csv?${params.toString()}`);
    if (!response.ok) throw new Error('Ошибка скачивания');
    return await response.blob();
  },

  async downloadTransactionsCsv(userId?: string, decision?: string) {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (decision) params.append('decision', decision);

    const response = await api.get(`/transactions/export-csv?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Возвращаем объект с items и total
  getTransactions: async (params: { user_id?: string, decision?: string, skip?: number, limit?: number }): Promise<{ items: Transaction[], total: number }> => {
    const res = await api.get('/transactions', { params });
    return res.data;
  },

  scoreTransaction: async (data: { id: string; user_id: string; amount: number; device_id?: string; }): Promise<Transaction> => {
    const res = await api.post('/score', data);
    return res.data;
  },

  getThresholds: async (): Promise<Thresholds> => {
    const res = await api.get('/thresholds');
    return res.data;
  },
  
  getDashboardAnalytics: async () => {
    const res = await api.get('/analytics');
    return res.data;
  },

  getAuditLogs: async (params: { user_id?: string, event_type?: string, skip?: number, limit?: number }): Promise<{ items: any[], total: number }> => {
    const res = await api.get('/audit', { params });
    return res.data;
  },

  updateThresholds: async (low_max: number, medium_max: number): Promise<Thresholds> => {
    const res = await api.post('/thresholds', { low_max, medium_max });
    return res.data;
  }
};