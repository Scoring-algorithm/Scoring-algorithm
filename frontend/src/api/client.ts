// src/api/client.ts
import axios from 'axios';
import type { Transaction, Thresholds } from '../types/transaction';

const api = axios.create({
  baseURL: 'http://localhost:8000', // Адрес бэкенда Ивана
  headers: { 'Content-Type': 'application/json' },
});

export const apiService = {
  // Получить список транзакций
  getTransactions: async (): Promise<Transaction[]> => {
    const res = await api.get('/transactions');
    return res.data;
  },

  // Отправить новую транзакцию на скоринг
  scoreTransaction: async (data: { 
    id: string; 
    user_id: string; 
    amount: number; 
    device_id?: string; 
  }): Promise<Transaction> => {
    const res = await api.post('/score', data);
    return res.data;
  },

  // Получить текущие пороги
  getThresholds: async (): Promise<Thresholds> => {
    const res = await api.get('/thresholds');
    return res.data;
  },

  // Обновить пороги
  updateThresholds: async (low_max: number, medium_max: number): Promise<Thresholds> => {
    const res = await api.post('/thresholds', { low_max, medium_max });
    return res.data;
  }
};