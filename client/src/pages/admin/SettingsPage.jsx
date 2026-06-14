import { useEffect, useState, useRef } from 'react';
import api from '../../utils/request';

export default function SettingsPage() {
  const [cfg, setCfg] = useState({ site_open: '1', custom_questions: '[]' });
  const [q, setQ] = useState([]);
  const [qrUrl, setQrUrl] = useState('');
  const qrImgRef = useRef(null);
  const [identityCodes, setIdentityCodes] = useState([]);
  const [newCode, setNewCode] = useState('');
  const [newBlessing, setNewBlessing] = useState('');
  const [editId, setEditId] = useState(null);
  const [editCode, setEditCode] = useState('');
  const [editBlessing, setEditBlessing] = useState('');
  const [icError, setIcError] = useState('');

  useEffect(() => { api.get('/admin/config').then(r => {
    setCfg(r.data);
    try { setQ(JSON.parse(r.data.custom_questions || '[]')); } catch { setQ([]); }
  }).catch(() => {}); fetchIdentityCodes(); }, []);

  const fetchIdentityCodes = () => {
    api.get('/admin/identity-codes').then(r => setIdentityCodes(r.data)).catch(() => {});
  };

  const save = async (k, v) => {
    await api.put('/admin/config', { [k]: String(v) });
    setCfg(prev => ({ ...prev, [k]: String(v) }));
  };

  const saveQuestions = () => { save('custom_questions', JSON.stringify(q)); };

  const genQr = async () => {
    const url = window.location.origin;
    const resp = await api.get('/admin/qrcode', { params: { url }, responseType: 'blob' });
    const blob = new Blob([resp.data], { type: 'image/png' });
    setQrUrl(URL.createObjectURL(blob));
  };

  const [pdfLoading, setPdfLoading] = useState(false);

  const exportJson = () => { window.open('/api/admin/export/json', '_blank'); };
  const exportExcel = () => { window.open('/api/admin/export/excel', '_blank'); };
  const exportPdf = async () => {
    setPdfLoading(true);
    try {
      const r = await api.get('/admin/export/pdf', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = '同学录.pdf'; a.click();
      URL.revokeObjectURL(url);
    } finally { setPdfLoading(false); }
  };

  // --- 身份验证码 CRUD ---
  const addIdentityCode = async () => {
    if (!newCode.trim() || !newBlessing.trim()) return;
    setIcError('');
    try {
      await api.post('/admin/identity-codes', { code: newCode.trim(), blessing_message: newBlessing.trim() });
      setNewCode(''); setNewBlessing('');
      fetchIdentityCodes();
    } catch (e) { setIcError(e.response?.data?.error || e.message); }
  };
  const startEdit = (ic) => { setEditId(ic.id); setEditCode(ic.code); setEditBlessing(ic.blessing_message); };
  const cancelEdit = () => { setEditId(null); setEditCode(''); setEditBlessing(''); setIcError(''); };
  const saveEdit = async (id) => {
    setIcError('');
    try {
      await api.put(`/admin/identity-codes/${id}`, { code: editCode.trim(), blessing_message: editBlessing.trim() });
      cancelEdit(); fetchIdentityCodes();
    } catch (e) { setIcError(e.response?.data?.error || e.message); }
  };
  const deleteIdentityCode = async (id) => {
    if (!confirm('确定删除此验证码？')) return;
    await api.delete(`/admin/identity-codes/${id}`); fetchIdentityCodes();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800">网站设置</h1>

      {/* 网站开关 */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-3">🌐 网站状态</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={cfg.site_open === '1'} onChange={(e) => save('site_open', e.target.checked ? '1' : '0')}
            className="w-5 h-5 text-indigo-600 rounded" />
          <span className="text-sm text-gray-700">{cfg.site_open === '1' ? '已开启 — 同学可填写' : '已关闭 — 显示截止提示'}</span>
        </label>
      </section>

      {/* 自定义问答 */}
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-3">
        <h2 className="text-lg font-semibold">❓ 自定义问答题目</h2>
        {q.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input value={typeof item === 'string' ? item : item.question || ''}
              onChange={e => { const n = [...q]; n[i] = e.target.value; setQ(n); }}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none"
              placeholder="输入问题..." />
            <button type="button" onClick={() => { setQ(q.filter((_, j) => j !== i)); }}
              className="text-red-500 hover:text-red-700 text-sm">删除</button>
          </div>
        ))}
        <button type="button" onClick={() => setQ([...q, ''])}
          className="text-indigo-600 hover:underline text-sm">+ 添加问题</button>
        <button type="button" onClick={saveQuestions}
          className="block px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">保存题目</button>
      </section>

      {/* 身份验证码管理 */}
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-3">
        <h2 className="text-lg font-semibold">🔑 身份验证码管理</h2>
        <p className="text-xs text-gray-400">每个身份码绑定一条祝福语，同学输入匹配的验证码后可看到专属祝福</p>
        {icError && <p className="text-red-500 text-xs">{icError}</p>}
        {/* 已有列表 */}
        {identityCodes.length > 0 && (
          <ul className="space-y-2">
            {identityCodes.map(ic => (
              <li key={ic.id} className="border rounded-lg p-3 text-sm">
                {editId === ic.id ? (
                  <div className="space-y-2">
                    <input value={editCode} onChange={e => setEditCode(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="验证码" />
                    <textarea value={editBlessing} onChange={e => setEditBlessing(e.target.value)} rows={2}
                      className="w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" placeholder="祝福语" />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(ic.id)} className="text-indigo-600 hover:underline text-xs">保存</button>
                      <button onClick={cancelEdit} className="text-gray-500 hover:underline text-xs">取消</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{ic.code}</p>
                      <p className="text-gray-500 text-xs truncate mt-0.5">{ic.blessing_message}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => startEdit(ic)} className="text-indigo-600 hover:underline text-xs">编辑</button>
                      <button onClick={() => deleteIdentityCode(ic.id)} className="text-red-500 hover:underline text-xs">删除</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {/* 添加表单 */}
        <div className="space-y-2 pt-2 border-t">
          <input value={newCode} onChange={e => setNewCode(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none"
            placeholder="验证码（如：SECRET2026）" />
          <textarea value={newBlessing} onChange={e => setNewBlessing(e.target.value)} rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none"
            placeholder="祝福语（如：祝你前程似锦，未来可期！）" />
          <button onClick={addIdentityCode}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">添加身份码</button>
        </div>
      </section>

      {/* 二维码 */}
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-3">
        <h2 className="text-lg font-semibold">📱 填写入口二维码</h2>
        <button onClick={genQr} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">生成二维码</button>
        {qrUrl && (
          <div className="space-y-2">
            <img ref={qrImgRef} src={qrUrl} alt="QR Code" className="w-48 h-48 border rounded" />
            <a href={qrUrl} download="qrcode.png" className="block text-indigo-600 hover:underline text-sm">⬇ 下载二维码</a>
          </div>
        )}
      </section>

      {/* 导出 */}
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-3">
        <h2 className="text-lg font-semibold">📦 数据导出</h2>
        <div className="flex gap-3 flex-wrap">
          <button onClick={exportJson} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900">导出 JSON（含留言）</button>
          <button onClick={exportExcel} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">导出 Excel</button>
          <button onClick={exportPdf} disabled={pdfLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
            {pdfLoading ? '⏳ 生成中...' : '📄 导出 PDF'}
          </button>
        </div>
      </section>
    </div>
  );
}
