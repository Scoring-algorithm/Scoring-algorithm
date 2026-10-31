// src/pages/DashboardPage.tsx
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiService } from '../api/client';
import type { Transaction } from '../types/transaction';
import Loader from '../components/Loader';

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getTransactions().then(data => {
      setTransactions(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Loader />;

  // Считаем статистику
  const stats = transactions.reduce((acc, t) => {
    acc[t.decision] = (acc[t.decision] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = [
    { name: 'Одобрено', value: stats['approve'] || 0, color: '#16a34a' },
    { name: 'На проверке', value: stats['review'] || 0, color: '#f59e0b' },
    { name: 'Отклонено', value: stats['reject'] || 0, color: '#dc2626' },
  ].filter(d => d.value > 0);

  return (
    <div>
      <h1>Дашборд</h1>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1, background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>Распределение решений</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ flex: 1, background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
           <h3 style={{ marginTop: 0 }}>Общая сводка</h3>
           <p>Всего транзакций: <b>{transactions.length}</b></p>
           <p>Средний уровень риска: <b>{ (transactions.reduce((s, t) => s + t.score, 0) / (transactions.length || 1)).toFixed(2) }</b></p>
        </div>
      </div>
    </div>
  );
}