import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/request';

export default function EntriesPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const SIZE = 20;

  const load = useCallback(async (p, s) => {
    try {
      const { data } = await api.get('/admin/entries', { params: { page: p, size: SIZE, search: s } });
      setRows(data.rows); setTotal(data.total); setPage(p);
    } catch { /* 静默 */ }
  }, []);

  useEffect(() => { load(1, ''); }, [load]);

  const toggleVis = async (id) => {
    const { data } = await api.patch(`/admin/entries/${id}/visibility`);
    setRows((r) => r.map((e) => (e.id === id ? { ...e, is_visible: data.is_visible } : e)));
  };

  const del = async (id) => {
    if (!confirm('确定删除？')) return;
    await api.delete(`/admin/entries/${id}`);
    load(page, search);
  };

  const onSearch = (e) => { e.preventDefault(); load(1, search); };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">条目管理 ({total})</h1>
      <form onSubmit={onSearch} className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm flex-1 focus:ring-1 focus:ring-indigo-400 focus:outline-none"
          placeholder="搜索姓名..." />
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">搜索</button>
      </form>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">姓名</th><th className="text-left px-4 py-3">班级</th>
              <th className="text-left px-4 py-3">标签</th><th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">时间</th><th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{e.name}</td>
                <td className="px-4 py-3 text-gray-500">{e.class_name || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{e.label || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleVis(e.id)}
                    className={`px-2 py-0.5 rounded-full text-xs ${e.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {e.is_visible ? '可见' : '隐藏'}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 text-center">{e.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3 text-center space-x-1">
                  <button onClick={() => nav(`/admin/entries/${e.id}`)}
                    className="text-indigo-600 hover:underline text-xs">详情</button>
                  <button onClick={() => nav(`/admin/entries/${e.id}/edit`)}
                    className="text-amber-600 hover:underline text-xs">编辑</button>
                  <button onClick={() => del(e.id)}
                    className="text-red-500 hover:underline text-xs">删除</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">暂无数据</td></tr>}
          </tbody>
        </table>
      </div>
      {total > SIZE && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.ceil(total / SIZE) }, (_, i) => (
            <button key={i} onClick={() => load(i + 1, search)}
              className={`px-3 py-1 rounded text-sm ${page === i + 1 ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
