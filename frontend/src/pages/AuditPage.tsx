// src/pages/AuditPage.tsx
export default function AuditPage() {
  return (
    <div>
      <h1>Аудит-лог</h1>
      <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <p>Журнал неизменяемых событий (append-only).</p>
        <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, fontFamily: 'monospace', fontSize: 13 }}>
          <div>[2026-09-25 10:15:00] <b>score_decision</b> | Actor: scoring_service | TX: tx-1 | Score: 0.12</div>
          <div>[2026-09-25 10:20:00] <b>thresholds_updated</b> | Actor: admin | Low: 0.3 -&gt; 0.4 | Med: 0.7 -&gt; 0.8</div>
          <div>[2026-09-25 10:25:00] <b>score_decision</b> | Actor: scoring_service | TX: tx-2 | Score: 0.85</div>
        </div>
      </div>
    </div>
  );
}