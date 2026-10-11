import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function LoginPage() {
  const nav = useNavigate();
  const [username, setUser] = useState('');
  const [password, setPass] = useState('');
  const [error, setError] = useState('');

  const login = async (e) => {
    e.preventDefault(); setError('');
    try {
      const { data } = await axios.post('/api/admin/login', { username, password });
      localStorage.setItem('admin_token', data.token);
      nav('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || '登录失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <form onSubmit={login} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-5">
        <h1 className="text-2xl font-bold text-center text-gray-800">🔐 管理员登录</h1>
        <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none"
          placeholder="用户名" value={username} onChange={e => setUser(e.target.value)} autoFocus />
        <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none"
          placeholder="密码" value={password} onChange={e => setPass(e.target.value)} />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">
          登录
        </button>
      </form>
    </div>
  );
}
