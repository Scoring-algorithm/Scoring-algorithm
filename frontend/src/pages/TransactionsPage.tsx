// src/pages/TransactionsPage.tsx
import { useEffect, useState } from 'react';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Loader from '../components/Loader';
import { apiService } from '../api/client';
import type { Transaction } from '../types/transaction';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Transaction | null>(null);
  
  // Стейт для формы создания транзакции
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ id: `TX-${Date.now()}`, user_id: 'user-1', amount: 1000, device_id: 'iphone-12' });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiService.getTransactions();
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleScore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.scoreTransaction({
        id: formData.id,
        user_id: formData.user_id,
        amount: Number(formData.amount),
        device_id: formData.device_id
      });
      setIsFormOpen(false);
      setFormData({ ...formData, id: `TX-${Date.now()}`, amount: 1000 }); // Сброс
      loadData(); // Обновляем таблицу
    } catch (e) {
      alert("Ошибка при отправке");
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>Мониторинг транзакций</h1>
        <Button onClick={() => setIsFormOpen(true)}>+ Симулировать транзакцию</Button>
      </div>

      <table style={{ width: '100%', background: '#fff', borderRadius: 8, borderCollapse: 'collapse', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <tr>
            <th style={{ padding: 12, textAlign: 'left' }}>ID</th>
            <th style={{ padding: 12, textAlign: 'left' }}>Юзер</th>
            <th style={{ padding: 12, textAlign: 'left' }}>Сумма</th>
            <th style={{ padding: 12, textAlign: 'left' }}>Скоринг (0-1)</th>
            <th style={{ padding: 12, textAlign: 'left' }}>Решение</th>
            <th style={{ padding: 12 }}></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: 12, fontWeight: 500 }}>{t.transaction_id}</td>
              <td style={{ padding: 12 }}>{t.user_id}</td>
              <td style={{ padding: 12 }}>{t.amount.toLocaleString()} {t.currency}</td>
              <td style={{ padding: 12 }}>
                <span style={{ fontWeight: 700, color: t.score > 0.7 ? '#dc2626' : t.score > 0.3 ? '#f59e0b' : '#16a34a' }}>
                  {t.score}
                </span>
              </td>
              <td style={{ padding: 12 }}><Badge status={t.decision} /></td>
              <td style={{ padding: 12, textAlign: 'right' }}>
                <Button variant="secondary" onClick={() => setSelected(t)}>Детали</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Модалка создания */}
      {isFormOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleScore} style={{ background: '#fff', padding: 24, borderRadius: 12, width: 400 }}>
            <h2>Новая транзакция</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <label>User ID <input value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} style={{width: '100%', padding: 8}}/></label>
              <label>Сумма <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} style={{width: '100%', padding: 8}}/></label>
              <label>Устройство <input value={formData.device_id} onChange={e => setFormData({...formData, device_id: e.target.value})} style={{width: '100%', padding: 8}}/></label>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Button>Отправить на скоринг</Button>
              <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Отмена</Button>
            </div>
          </form>
        </div>
      )}

      {/* Модалка деталей */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: 24, borderRadius: 12, width: 500 }}>
            <h2 style={{ marginTop: 0 }}>{selected.transaction_id}</h2>
            <p><b>Сумма:</b> {selected.amount} {selected.currency}</p>
            <p><b>Устройство:</b> {selected.device_id || 'Неизвестно'}</p>
            <p><b>Решение:</b> <Badge status={selected.decision} /></p>
            
            {selected.features_used && (
              <div style={{ marginTop: 24 }}>
                <h3>Признаки (Feature Engineering)</h3>
                <pre style={{ background: '#f1f5f9', padding: 12, borderRadius: 8 }}>
                  {JSON.stringify(selected.features_used, null, 2)}
                </pre>
              </div>
            )}
            <div style={{ marginTop: 24, textAlign: 'right' }}>
               <Button variant="secondary" onClick={() => setSelected(null)}>Закрыть</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}