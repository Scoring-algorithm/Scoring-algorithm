import { useEffect, useState } from 'react';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Loader from '../components/Loader';
import { apiService } from '../api/client';
import type { Transaction } from '../types/transaction';

// Вспомогательная функция для красивого вывода даты
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Transaction | null>(null);
  
  // Фильтры и пагинация
  const [filterUserId, setFilterUserId] = useState('');
  const [filterDecision, setFilterDecision] = useState('');
  const [page, setPage] = useState(0);
  const limit = 10;

  // Стейт для формы создания транзакции
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ id: `TX-${Date.now()}`, user_id: 'user-1', amount: 1000, device_id: 'iphone-12' });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiService.getTransactions({
        user_id: filterUserId || undefined,
        decision: filterDecision || undefined,
        skip: page * limit,
        limit: limit
      });
      setTransactions(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await apiService.downloadTransactionsCsv(
        filterUserId || undefined, 
        filterDecision || undefined
      );
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Не удалось выгрузить CSV-файл.");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { loadData(); }, 300);
    return () => clearTimeout(timer);
  }, [filterUserId, filterDecision, page]);

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
      setFormData({ ...formData, id: `TX-${Date.now()}`, amount: 1000 });
      setPage(0);
      loadData(); 
    } catch (e) {
      alert("Ошибка при отправке");
    }
  };

  const handleFilterChange = (setter: any, value: string) => {
    setter(value);
    setPage(0);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>Мониторинг транзакций</h1>
        <Button onClick={() => setIsFormOpen(true)}>+ Симулировать транзакцию</Button>
      </div>

{/* Панель фильтров */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>User ID</span>
          <input 
            type="text" 
            value={filterUserId} 
            onChange={(e) => handleFilterChange(setFilterUserId, e.target.value)} 
            placeholder="Поиск по юзеру..."
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Решение</span>
          <select 
            value={filterDecision} 
            onChange={(e) => handleFilterChange(setFilterDecision, e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', minWidth: '140px', outline: 'none' }}
          >
            <option value="">Все решения</option>
            <option value="approve">approve</option>
            <option value="review">review</option>
            <option value="reject">reject</option>
          </select>
        </div>

        {/* Кнопка выгрузки */}
        <button 
          onClick={handleExportCSV}
          style={{
            padding: '8px 16px',
            background: '#0f172a',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 500,
            fontSize: '14px',
            cursor: 'pointer',
            height: '35px',
            display: 'flex',
            alignItems: 'center',
            marginLeft: 'auto' // Прижимает кнопку к правому краю
          }}
        >
          Выгрузить CSV
        </button>
      </div>

      {loading ? <Loader /> : (
        <>
          <table style={{ width: '100%', background: '#fff', borderRadius: 8, borderCollapse: 'collapse', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: 12, textAlign: 'left' }}>ID</th>
                {/* НОВАЯ КОЛОНКА */}
                <th style={{ padding: 12, textAlign: 'left' }}>Дата и время</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Юзер</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Сумма</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Скоринг</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Решение</th>
                <th style={{ padding: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', background: selected?.id === t.id ? '#f8fafc' : 'transparent' }}>
                  <td style={{ padding: 12, fontWeight: 500 }}>{t.transaction_id}</td>
                  {/* ВЫВОД ДАТЫ */}
                  <td style={{ padding: 12, color: '#475569', fontSize: 14 }}>
                    {formatDate(t.created_at)}
                  </td>
                  <td style={{ padding: 12 }}>{t.user_id}</td>
                  <td style={{ padding: 12 }}>{t.amount.toLocaleString()} {t.currency}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ 
                      fontWeight: 700, 
                      color: '#0f172a' // Если порогов нет (старые записи) — черный
                    }}>
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

          {/* ПАГИНАЦИЯ */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ color: '#64748b', fontSize: 14 }}>
              Найдено записей: {total}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                Назад
              </Button>
              <span style={{ padding: '8px 16px', fontSize: 14 }}>Стр. {page + 1}</span>
              <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= total}>
                Вперед
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ================= МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ ================= */}
      {selected && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{ 
            background: '#fff', padding: 32, borderRadius: 16, width: '100%', maxWidth: 500,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Детали транзакции</h2>
              <Badge status={selected.decision} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>ID транзакции:</span>
                <span style={{ fontWeight: 600 }}>{selected.transaction_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Дата и время:</span>
                <span style={{ fontWeight: 600 }}>{formatDate(selected.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Пользователь:</span>
                <span style={{ fontWeight: 600 }}>{selected.user_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Устройство:</span>
                <span style={{ fontWeight: 600 }}>{selected.device_id || 'Неизвестно'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Сумма:</span>
                <span style={{ fontWeight: 600 }}>{selected.amount.toLocaleString()} {selected.currency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Скоринг (риск):</span>
                <span style={{ fontWeight: 700, color: selected.score > 0.7 ? '#dc2626' : selected.score > 0.3 ? '#f59e0b' : '#16a34a' }}>
                  {selected.score}
                </span>
              </div>
            </div>

            {/* ПОРОГИ */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginTop: 8 }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12, fontWeight: 600 }}>Пороги на момент решения:</div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                {/* Зона одобрения */}
                <div style={{ flex: selected.threshold_low || 0.3, height: 8, background: '#16a34a', borderRadius: '4px 0 0 4px' }}></div>
                {/* Зона проверки */}
                <div style={{ flex: (selected.threshold_medium || 0.7) - (selected.threshold_low || 0.3), height: 8, background: '#f59e0b' }}></div>
                {/* Зона отказа */}
                <div style={{ flex: 1 - (selected.threshold_medium || 0.7), height: 8, background: '#dc2626', borderRadius: '0 4px 4px 0' }}></div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#64748b' }}>
                <span>0.0</span>
                <span style={{ marginLeft: `${(selected.threshold_low || 0.3) * 100}%` }}>
                  Low: {selected.threshold_low ?? '—'}
                </span>
                <span style={{ marginLeft: `${((selected.threshold_medium || 0.7) - (selected.threshold_low || 0.3)) * 100}%` }}>
                  Med: {selected.threshold_medium ?? '—'}
                </span>
                <span>1.0</span>
              </div>
            </div>
            
            {/* ПРИЧИНЫ РЕШЕНИЯ */}
            {selected.reasons && selected.reasons.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12, fontWeight: 600 }}>Факторы, повлиявшие на решение:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.reasons.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                      <span style={{ 
                        width: 10, height: 10, borderRadius: '50%', 
                        background: r.type === 'risk' ? '#dc2626' : r.type === 'safe' ? '#16a34a' : '#94a3b8' 
                      }}></span>
                      <span style={{ color: '#334155', fontWeight: 500 }}>{r.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
              <Button onClick={() => setSelected(null)}>Закрыть</Button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка создания */}
      {isFormOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleScore} style={{ background: '#fff', padding: 24, borderRadius: 12, width: 400 }}>
            <h2>Новая транзакция</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                User ID 
                <input value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Amount
                <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Device ID
                <input value={formData.device_id} onChange={e => setFormData({...formData, device_id: e.target.value})} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Отмена</Button>
              <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>
                Отправить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}