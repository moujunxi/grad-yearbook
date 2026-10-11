import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const links = [
  { to: '/admin/dashboard', label: '📊 统计' },
  { to: '/admin/entries', label: '📋 条目' },
  { to: '/admin/settings', label: '⚙️ 设置' },
];

export default function Layout() {
  const nav = useNavigate();
  const token = localStorage.getItem('admin_token');

  useEffect(() => { if (!token) nav('/admin/login', { replace: true }); }, [token, nav]);

  if (!token) return null;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-white border-r shadow-sm p-4 flex flex-col gap-1">
        <h2 className="text-lg font-bold text-indigo-600 mb-4 px-3">🎓 6F 后台</h2>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            {l.label}
          </NavLink>
        ))}
        <div className="flex-1" />
        <button onClick={() => { localStorage.removeItem('admin_token'); nav('/admin/login'); }}
          className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 text-left">
          🚪 退出
        </button>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
