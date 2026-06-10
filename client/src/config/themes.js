const themes = [
  // ---- 4 纯色 ----
  { key: 'solid-indigo',  label: '靛青', css: { background: '#6366f1' } },
  { key: 'solid-rose',    label: '玫红', css: { background: '#f43f5e' } },
  { key: 'solid-emerald', label: '翠绿', css: { background: '#10b981' } },
  { key: 'solid-amber',   label: '琥珀', css: { background: '#f59e0b' } },

  // ---- 4 渐变 ----
  { key: 'grade-sunset',   label: '日落', css: { background: 'linear-gradient(135deg, #f97316, #ec4899)' } },
  { key: 'grade-ocean',    label: '海洋', css: { background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' } },
  { key: 'grade-forest',   label: '森林', css: { background: 'linear-gradient(135deg, #22c55e, #059669)' } },
  { key: 'grade-twilight', label: '暮光', css: { background: 'linear-gradient(135deg, #8b5cf6, #1e1b4b)' } },

  // ---- 4 淡花纹 ----
  { key: 'pattern-dots',  label: '圆点', css: {
    background: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    backgroundColor: '#f8fafc',
  } },
  { key: 'pattern-grid',  label: '网格', css: {
    background: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    backgroundColor: '#f8fafc',
  } },
  { key: 'pattern-cross', label: '十字', css: {
    background: 'repeating-linear-gradient(45deg, #e2e8f0 0, #e2e8f0 1px, transparent 0, transparent 10px)',
    backgroundColor: '#f8fafc',
  } },
  { key: 'pattern-waves', label: '波纹', css: {
    background: 'linear-gradient(0deg, #bfdbfe 0%, #eff6ff 50%, #bfdbfe 100%)',
    backgroundColor: '#eff6ff',
  } },
];

export default themes;
