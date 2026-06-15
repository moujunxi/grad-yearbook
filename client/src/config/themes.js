const themes = [
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
