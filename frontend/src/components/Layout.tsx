import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  const links = [
    { to: '/transactions', label: 'Транзакции' },
    { to: '/thresholds', label: 'Пороги' },
    { to: '/dashboard', label: 'Дашборд' },
    { to: '/audit', label: 'Аудит-лог' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <aside style={{ width: 220, background: '#1e293b', color: '#fff', padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Scoring System</h3>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 24 }}>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              style={{
                color: '#fff',
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: 6,
                background: location.pathname === l.to ? '#334155' : 'transparent',
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 24, background: '#f1f5f9' }}>
        <Outlet />
      </main>
    </div>
  );
}