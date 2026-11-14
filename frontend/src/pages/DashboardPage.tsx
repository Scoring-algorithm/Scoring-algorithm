import { useEffect, useState, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { apiService } from '../api/client';
import Loader from '../components/Loader';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Ссылка на DOM-элемент дашборда
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiService.getDashboardAnalytics()
      .then(res => { setData(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ФУНКЦИЯ СКАЧИВАНИЯ PDF
  const handleDownloadPdf = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);

    try {
      // 1. Делаем "скриншот" дашборда
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2, // Увеличиваем разрешение для четкости
        backgroundColor: '#f1f5f9', // Цвет фона страницы
        useCORS: true, 
      });

      const imgData = canvas.toDataURL('image/png');
      
      // 2. Создаем PDF (альбомная ориентация, миллиметры)
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Вычисляем пропорции, чтобы картинка влезла на лист
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const newWidth = imgWidth * ratio;
      const newHeight = imgHeight * ratio;

      // Центрируем изображение на листе
      const marginX = (pdfWidth - newWidth) / 2;
      const marginY = (pdfHeight - newHeight) / 2;

      pdf.addImage(imgData, 'PNG', marginX, marginY, newWidth, newHeight);
      pdf.save(`dashboard_report_${Date.now()}.pdf`);
    } catch (error) {
      console.error("Ошибка при создании PDF:", error);
      alert("Не удалось скачать PDF. Попробуйте еще раз.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <Loader />;
  if (!data || !data.summary) return <div>Нет данных для отображения</div>;

  const { summary, top_rejections, monthly_trends, daily_trends } = data;
  
  const total = summary.approve + summary.review + summary.reject;
  const pieData = [
    { name: 'Одобрено', value: summary.approve, color: '#16a34a' },
    { name: 'На проверке', value: summary.review, color: '#f59e0b' },
    { name: 'Отклонено', value: summary.reject, color: '#dc2626' },
  ].filter(d => d.value > 0);

  const cardStyle = { background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' as const };
  const titleStyle = { margin: '0 0 20px 0', fontSize: 16, fontWeight: 600, color: '#1e293b' };

  return (
    <div>
      {/* Шапка с кнопкой выгрузки (не попадет в PDF, если захватывать только блок ниже) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Аналитический дашборд</h1>
        <button 
          onClick={handleDownloadPdf} 
          disabled={isExporting}
          style={{ 
            background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', 
            borderRadius: '8px', fontWeight: 600, cursor: isExporting ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          {isExporting ? 'Генерация...' : 'Скачать PDF'}
        </button>
      </div>

      {/* Блок, который будет захвачен в PDF */}
      <div ref={dashboardRef} style={{ padding: '10px', background: '#f1f5f9' }}>
        
        {/* ВЕРХНИЙ РЯД */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }}>
          <div style={cardStyle}>
            <h3 style={titleStyle}>Общая сводка</h3>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{total}</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>всего транзакций в системе</div>
            <div style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#16a34a' }}>● Одобрено</span>
                <span style={{ fontWeight: 600 }}>{((summary.approve / total) * 100).toFixed(1)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#f59e0b' }}>● На проверке</span>
                <span style={{ fontWeight: 600 }}>{((summary.review / total) * 100).toFixed(1)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#dc2626' }}>● Отклонено</span>
                <span style={{ fontWeight: 600 }}>{((summary.reject / total) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={titleStyle}>Соотношение решений</h3>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} шт.`, 'Количество']} />
                  <Legend verticalAlign="middle" align="right" layout="vertical" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* СРЕДНИЙ РЯД */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div style={cardStyle}>
            <h3 style={titleStyle}>Статистика по месяцам</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="approve" name="Одобрено" fill="#16a34a" stackId="a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="review" name="На проверке" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="reject" name="Отклонено" fill="#dc2626" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={titleStyle}>Колебания среднего скоринга</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [value, 'Средний скор']} />
                  <Line type="monotone" dataKey="avg_score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* НИЖНИЙ РЯД */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={cardStyle}>
            <h3 style={titleStyle}>Распределение по дням недели</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="approve" name="Одобрено" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reject" name="Отклонено" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={titleStyle}>Топ-5 причин отказа</h3>
            <div style={{ height: 300 }}>
              {top_rejections.length === 0 ? (
                <div style={{ color: '#64748b', textAlign: 'center', paddingTop: 100 }}>Нет данных</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top_rejections} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="reason" type="category" width={150} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [value, 'Кол-во отказов']} />
                    <Bar dataKey="count" fill="#dc2626" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}