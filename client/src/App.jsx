import { Routes, Route } from 'react-router-dom';
import FormPage from './pages/FormPage';
import ThankYouPage from './pages/ThankYouPage';
import LoginPage from './pages/admin/LoginPage';
import Layout from './pages/admin/Layout';
import DashboardPage from './pages/admin/DashboardPage';
import EntriesPage from './pages/admin/EntriesPage';
import EntryDetailPage from './pages/admin/EntryDetailPage';
import EditEntryPage from './pages/admin/EditEntryPage';
import SettingsPage from './pages/admin/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<FormPage />} />
      <Route path="/thank-you" element={<ThankYouPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<Layout />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="entries" element={<EntriesPage />} />
        <Route path="entries/:id" element={<EntryDetailPage />} />
        <Route path="entries/:id/edit" element={<EditEntryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route index element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}
