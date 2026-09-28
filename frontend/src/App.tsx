import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import TransactionsPage from './pages/TransactionsPage';
import ThresholdsPage from './pages/ThresholdsPage';
import DashboardPage from './pages/DashboardPage';
import AuditPage from './pages/AuditPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/transactions" />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="thresholds" element={<ThresholdsPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>
    </Routes>
  );
}