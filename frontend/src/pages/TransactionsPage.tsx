import { useMemo, useState } from 'react';
import Badge from '../components/Badge';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { mockTransactions } from '../mocks/transactions';
import type { Transaction, TransactionStatus } from '../types/transaction';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const byStatus = statusFilter === 'all' || t.status === statusFilter;
      const bySearch =
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        t.merchant.toLowerCase().includes(search.toLowerCase());
      return byStatus && bySearch;
    });
  }, [transactions, statusFilter, search]);

  const decide = (id: string, status: TransactionStatus) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    setSelected(null);
  };

  return (
    <div>
      <h1>Транзакции</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Поиск по ID или мерчанту"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', flex: 1 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TransactionStatus | 'all')}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
        >
          <option value="all">Все статусы</option>
          <option value="pending">В ожидании</option>
          <option value="approved">Одобрено</option>
          <option value="rejected">Отказано</option>
          <option value="review">На проверке</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="Транзакций не найдено" />
      ) : (
        <table style={{ width: '100%', background: '#fff', borderRadius: 8, overflow: 'hidden', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#e2e8f0' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left' }}>ID</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Сумма</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Канал</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Мерчант</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Скоринг</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Статус</th>
              <th style={{ padding: 10 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: 10 }}>{t.id}</td>
                <td style={{ padding: 10 }}>
                  {t.amount.toLocaleString()} {t.currency}
                </td>
                <td style={{ padding: 10 }}>{t.channel}</td>
                <td style={{ padding: 10 }}>{t.merchant}</td>
                <td
                  style={{
                    padding: 10,
                    color: t.score > 70 ? '#dc2626' : t.score > 30 ? '#f59e0b' : '#16a34a',
                    fontWeight: 600,
                  }}
                >
                  {t.score}
                </td>
                <td style={{ padding: 10 }}>
                  <Badge status={t.status} />
                </td>
                <td style={{ padding: 10 }}>
                  <Button variant="secondary" onClick={() => setSelected(t)}>
                    Открыть
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <TransactionModal
          transaction={selected}
          onClose={() => setSelected(null)}
          onDecide={decide}
        />
      )}
    </div>
  );
}

function TransactionModal({
  transaction,
  onClose,
  onDecide,
}: {
  transaction: Transaction;
  onClose: () => void;
  onDecide: (id: string, status: TransactionStatus) => void;
}) {
  const t = transaction;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          width: 560,
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <h2 style={{ marginTop: 0 }}>{t.id}</h2>
        <p>
          <b>Сумма:</b> {t.amount.toLocaleString()} {t.currency}
        </p>
        <p>
          <b>Канал:</b> {t.channel}
        </p>
        <p>
          <b>Мерчант:</b> {t.merchant}
        </p>
        <p>
          <b>Дата:</b> {new Date(t.createdAt).toLocaleString('ru-RU')}
        </p>
        <p>
          <b>Скоринговый балл:</b>{' '}
          <span
            style={{
              color: t.score > 70 ? '#dc2626' : t.score > 30 ? '#f59e0b' : '#16a34a',
              fontWeight: 700,
            }}
          >
            {t.score}
          </span>
        </p>

        <h3>Объяснение решения</h3>
        <p style={{ background: '#f1f5f9', padding: 12, borderRadius: 8 }}>{t.explanation}</p>

        <h3>Факторы, повлиявшие на решение</h3>
        <ul>
          {t.factors.map((f) => (
            <li key={f.name}>
              {f.name} —{' '}
              <b style={{ color: f.weight > 0 ? '#dc2626' : '#16a34a' }}>
                {f.weight > 0 ? '+' : ''}
                {f.weight}
              </b>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Button variant="primary" onClick={() => onDecide(t.id, 'approved')}>
            Одобрить
          </Button>
          <Button variant="danger" onClick={() => onDecide(t.id, 'rejected')}>
            Отказать
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}