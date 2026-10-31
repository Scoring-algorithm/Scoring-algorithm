import { useEffect, useState } from 'react';
import { apiService } from '../api/client';
import Loader from '../components/Loader';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getAuditLogs()
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  return (
    <div>
      <h1>Аудит-лог</h1>
      <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <p style={{ color: '#64748b', marginBottom: 16 }}>Журнал неизменяемых событий (append-only).</p>
        
        {logs.length === 0 ? (
          <div style={{ color: '#64748b' }}>Пока нет событий. Сделайте транзакцию или измените пороги!</div>
        ) : (
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
                      <>TX: {log.payload.transaction_id} | Score: <b>{log.payload.score}</b> | Decision: {log.payload.decision}</>
                    )}
                    {log.event_type === 'thresholds_updated' && (
                      <>Новые пороги: Low={log.payload.low}, Med={log.payload.medium}</>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}