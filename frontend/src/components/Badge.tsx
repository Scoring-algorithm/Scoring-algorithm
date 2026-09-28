import type { TransactionStatus } from '../types/transaction';

const colors: Record<TransactionStatus, string> = {
  pending: '#f59e0b',
  approved: '#16a34a',
  rejected: '#dc2626',
  review: '#6366f1',
};

const labels: Record<TransactionStatus, string> = {
  pending: 'В ожидании',
  approved: 'Одобрено',
  rejected: 'Отказано',
  review: 'На проверке',
};

export default function Badge({ status }: { status: TransactionStatus }) {
  return (
    <span
      style={{
        background: colors[status],
        color: '#fff',
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {labels[status]}
    </span>
  );
}