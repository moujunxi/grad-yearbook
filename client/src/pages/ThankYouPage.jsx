import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import EntryCard from '../components/EntryCard';

export default function ThankYouPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const entry = loc.state?.entry;
  const blessingMessage = loc.state?.blessingMessage;

  useEffect(() => { if (!entry) nav('/', { replace: true }); }, [entry, nav]);
  if (!entry) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 gap-6">
      <div className="text-5xl">✅</div>
      <h1 className="text-2xl font-bold text-gray-800">提交成功！</h1>
      <p className="text-gray-500">你的同学录信息已保存</p>
      <EntryCard entry={entry} />
      {blessingMessage && (
        <div className="max-w-sm w-full bg-indigo-50 border border-indigo-200 rounded-xl p-5 text-center space-y-2">
          <p className="text-2xl">🎉</p>
          <h3 className="text-sm font-semibold text-indigo-700">专属祝福语</h3>
          <p className="text-gray-700 leading-relaxed">{blessingMessage}</p>
        </div>
      )}
      <Link to="/" className="text-indigo-600 hover:underline text-sm">← 返回首页</Link>
    </div>
  );
}
