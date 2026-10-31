// src/pages/ThresholdsPage.tsx
import { useEffect, useState } from 'react';
import Button from '../components/Button';
import Loader from '../components/Loader';
import { apiService } from '../api/client';

export default function ThresholdsPage() {
  const [low, setLow] = useState(0.3);
  const [medium, setMedium] = useState(0.7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiService.getThresholds().then(data => {
      setLow(data.low_max);
      setMedium(data.medium_max);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (low >= medium) return alert("Нижний порог должен быть меньше верхнего!");
    setSaving(true);
    await apiService.updateThresholds(low, medium);
    setSaving(false);
    alert("Пороги успешно обновлены! (Событие записано в аудит)");
  };

  if (loading) return <Loader />;

  return (
    <div style={{ maxWidth: 600 }}>
      <h1>Настройка порогов</h1>
      <div style={{ background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        
        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
            <span>Одобрять, если Score меньше:</span>
            <span style={{ color: '#16a34a' }}>{low}</span>
          </label>
          <input type="range" min="0" max="1" step="0.05" value={low} onChange={e => setLow(Number(e.target.value))} style={{ width: '100%', marginTop: 8 }} />
        </div>

        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
            <span>Отклонять, если Score больше:</span>
            <span style={{ color: '#dc2626' }}>{medium}</span>
          </label>
          <input type="range" min="0" max="1" step="0.05" value={medium} onChange={e => setMedium(Number(e.target.value))} style={{ width: '100%', marginTop: 8 }} />
        </div>

        <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, marginBottom: 24 }}>
          <p style={{ margin: 0 }}>Зона проверки: от <b>{low}</b> до <b>{medium}</b></p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </div>
    </div>
  );
}