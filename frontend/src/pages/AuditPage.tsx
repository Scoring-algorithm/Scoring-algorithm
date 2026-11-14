// src/pages/AuditPage.tsx
import { useEffect, useState } from 'react';
import { apiService } from '../api/client';
import Loader from '../components/Loader';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterEventType, setFilterEventType] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAuditLogs({
        event_type: filterEventType || undefined,
        user_id: filterUserId || undefined,
        skip: page * limit,
        limit: limit
      });
      setLogs(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { loadLogs(); }, 300);
    return () => clearTimeout(timer);
  }, [filterEventType, filterUserId, page]);

  const handleFilterChange = (setter: any, value: string) => {
    setter(value);
    setPage(0);
  };

  const handleExportCSV = async () => {
    try {
      const blob = await apiService.downloadAuditCsv(filterEventType, filterUserId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_log_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setToastMessage('Файл выгружен успешно!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      alert('Не удалось выгрузить CSV-файл.');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <h1>Аудит-лог</h1>
      
      {toastMessage && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#10b981', color: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2000, fontWeight: 500, fontSize: '14px' }}>
          ✅ {toastMessage}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>User ID</span>
          <input type="text" value={filterUserId} onChange={(e) => handleFilterChange(setFilterUserId, e.target.value)} placeholder="Поиск по юзеру..." style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Тип события</span>
          <select value={filterEventType} onChange={(e) => handleFilterChange(setFilterEventType, e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', minWidth: '180px', outline: 'none' }}>
            <option value="">Все события</option>
            <option value="score_decision">score_decision</option>
            <option value="thresholds_updated">thresholds_updated</option>
          </select>
        </div>
        
        <button onClick={handleExportCSV} style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 500, fontSize: '14px', cursor: 'pointer', height: '35px', display: 'flex', alignItems: 'center' }}>
          Выгрузить CSV
        </button>
      </div>

      <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <p style={{ color: '#64748b', marginBottom: 16 }}>Журнал неизменяемых событий (append-only).</p>
        
        {loading ? <Loader /> : logs.length === 0 ? (
          <div style={{ color: '#64748b' }}>Записи не найдены. Измените параметры фильтрации!</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.map((log, index) => (
                <div key={index} style={{ padding: 12, background: '#f8fafc', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ color: '#64748b', marginBottom: 4 }}>
                    [{new Date(log.timestamp).toLocaleString('ru-RU')}] 
                    <b style={{ color: '#0f172a', marginLeft: 8 }}>{log.event_type}</b>
                  </div>
                  <div><b>Actor:</b> {log.actor}</div>
                  {log.payload && (
                    <div style={{ color: '#334155', marginTop: 4 }}>
                      {log.event_type === 'score_decision' && (
                        <>TX: {log.payload.transaction_id} | Юзер: {log.payload.user_id} | Score: <b>{log.payload.score}</b> | Decision: {log.payload.decision}</>
                      )}
                      {log.event_type === 'thresholds_updated' && (
                        <>Новые пороги: Low={log.payload.low}, Med={log.payload.medium}</>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ПАГИНАЦИЯ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <span style={{ color: '#64748b', fontSize: 14 }}>Найдено: {total}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: '8px 16px', background: page === 0 ? '#e2e8f0' : '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: page === 0 ? 'not-allowed' : 'pointer' }}>
                  Назад
                </button>
                <span style={{ padding: '8px 16px', fontSize: 14 }}>Стр. {page + 1}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= total} style={{ padding: '8px 16px', background: (page + 1) * limit >= total ? '#e2e8f0' : '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: (page + 1) * limit >= total ? 'not-allowed' : 'pointer' }}>
                  Вперед
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}