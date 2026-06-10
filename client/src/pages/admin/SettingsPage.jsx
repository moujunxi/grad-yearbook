import { useEffect, useState, useRef } from 'react';
import api from '../../utils/request';

export default function SettingsPage() {
  const [cfg, setCfg] = useState({ site_open: '1', custom_questions: '[]' });
  const [q, setQ] = useState([]);
  const [qrUrl, setQrUrl] = useState('');
  const qrImgRef = useRef(null);

  useEffect(() => { api.get('/admin/config').then(r => {
    setCfg(r.data);
    try { setQ(JSON.parse(r.data.custom_questions || '[]')); } catch { setQ([]); }
  }).catch(() => {}); }, []);

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
