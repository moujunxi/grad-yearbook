import { useState, useRef, useCallback } from 'react';

export default function IdentityCodeInput({ value, onChange }) {
  const [checking, setChecking] = useState(false);
  const [modalMsg, setModalMsg] = useState(null);
  const abortRef = useRef(null);

  const handleBlur = useCallback(async () => {
    const code = (value || '').trim();
    if (!code) return;

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setChecking(true);
    try {
      const res = await fetch(`/api/identity/lookup?code=${encodeURIComponent(code)}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.valid) {
        setModalMsg(data.blessing_message);
      }
    } catch (e) {
      if (e.name !== 'AbortError') { /* ignore */ }
    } finally {
      setChecking(false);
    }
  }, [value]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="输入身份验证码（选填）"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none"
        />
        {checking && <span className="text-xs text-gray-400 animate-pulse">查询中...</span>}
      </div>

      {/* Blessing Modal */}
      {modalMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setModalMsg(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="text-3xl">🎉</div>
            <h3 className="text-lg font-semibold text-gray-800">专属祝福语</h3>
            <p className="text-gray-600 leading-relaxed">{modalMsg}</p>
            <button
              type="button"
              onClick={() => setModalMsg(null)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
