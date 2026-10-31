// src/components/Badge.tsx
import type { Decision } from '../types/transaction';

const colors: Record<Decision, string> = {
  approve: '#16a34a', // Зеленый
  reject: '#dc2626',  // Красный
  review: '#f59e0b',  // Оранжевый
};

const labels: Record<Decision, string> = {
  approve: 'Одобрено',
  reject: 'Отклонено',
  review: 'На проверке',
};

export default function Badge({ status }: { status: Decision }) {
  return (
    <span
      style={{
        background: colors[status],
        color: '#fff',
        padding: '4px 12px',
        borderRadius: 16,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {labels[status]}
    </span>
  );
}