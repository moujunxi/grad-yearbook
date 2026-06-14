import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/request';
import EntryCard from '../../components/EntryCard';

export default function EntryDetailPage() {
  const { id } = useParams();
  const [entry, setEntry] = useState(null);

  useEffect(() => { api.get(`/admin/entries/${id}`).then(r => setEntry(r.data)).catch(() => {}); }, [id]);

  if (!entry) return <p className="text-gray-400 text-center py-12">加载中...</p>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link to="/admin/entries" className="text-indigo-600 hover:underline text-sm">← 返回列表</Link>
      <h1 className="text-2xl font-bold text-gray-800">{entry.name} 的详情</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-2 text-sm">
          {[['姓名', entry.name], ['性别', entry.gender], ['班级', entry.class_name],
            ['微信', entry.wechat], ['QQ', entry.qq], ['手机', entry.phone], ['邮箱', entry.email],
            ['介绍', entry.bio], ['座右铭', entry.motto], ['未来', entry.future],
            ['标签', entry.label], ['主题', entry.bg_theme],
            ['签名', entry.signature ? '已签名 ✍️' : '无'], ['身份码', entry.identity_code || '-'],
            ['可见', entry.is_visible ? '是' : '否'], ['提交时间', entry.created_at],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between"><span className="text-gray-500">{l}</span><span className="font-medium text-gray-800 text-right">{v || '-'}</span></div>
          ))}
          {entry.favorite_tags?.length > 0 && (
            <div className="flex justify-between"><span className="text-gray-500">兴趣标签</span>
              <span className="font-medium text-gray-800 text-right">{entry.favorite_tags.join(', ')}</span></div>
          )}
          {entry.signature && (
            <div className="mt-4 text-center border-t pt-4">
              <p className="text-sm text-gray-500 mb-2">✍️ 手写签名</p>
              <img src={entry.signature} alt="签名" className="max-w-[200px] max-h-[80px] mx-auto border rounded" />
            </div>
          )}
        </div>
        <div><EntryCard entry={entry} /></div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">💬 私密留言</h2>
        {entry.secret_messages?.length > 0 ? (
          <ul className="space-y-2">
            {entry.secret_messages.map((m) => (
              <li key={m.id} className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{m.content || '(空)'}</li>
            ))}
          </ul>
        ) : <p className="text-gray-400 text-sm">暂无留言</p>}
      </div>
    </div>
  );
}
