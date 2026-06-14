import { useState, useRef, useCallback } from 'react';

export default function IdentityCodeInput({ value, onChange, onVerified }) {
  const [status, setStatus] = useState(null); // null | 'checking' | 'valid' | 'invalid' | 'error'
  const [modalMsg, setModalMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const abortRef = useRef(null);

  const doLookup = useCallback(async () => {
    const code = (value || '').trim();
    if (!code) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('checking');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/identity/lookup?code=${encodeURIComponent(code)}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        setStatus('error');
        setErrorMsg('查询失败，请稍后重试');
        return;
      }
      const data = await res.json();
      if (data.valid) {
        setStatus('valid');
        setModalMsg(data.blessing_message);
        if (onVerified) onVerified(data.blessing_message);
      } else {
        setStatus('invalid');
        setErrorMsg('验证码无效，请检查后重试');
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setStatus('error');
        setErrorMsg('网络错误，请稍后重试');
      }
    }
  }, [value]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doLookup();
    }
  }, [doLookup]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => { onChange(e.target.value); setStatus(null); setErrorMsg(''); }}
          onKeyDown={handleKeyDown}
          placeholder="输入身份验证码（选填）"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={doLookup}
          disabled={status === 'checking' || !(value || '').trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 transition whitespace-nowrap"
        >
          {status === 'checking' ? '验证中...' : '验证'}
        </button>
      </div>

      {/* Status feedback */}
      {status === 'valid' && (
        <p className="text-green-600 text-xs mt-1">✅ 验证成功，请查看祝福语弹窗</p>
      )}
      {errorMsg && (status === 'invalid' || status === 'error') && (
        <p className="text-red-500 text-xs mt-1">{errorMsg}</p>
      )}

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
