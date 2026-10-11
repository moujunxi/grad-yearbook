import themes from '../config/themes';

export default function ThemeSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {themes.map((t) => (
        <button key={t.key} type="button" onClick={() => onChange(t.key)}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition
            ${value === t.key ? 'ring-2 ring-indigo-500 ring-offset-2' : 'hover:ring-1 hover:ring-gray-300'}`}>
          <div className="w-full rounded-md border border-gray-200 overflow-hidden"
            style={{ ...t.css, aspectRatio: '16/10' }} />
          <span className="text-xs text-gray-600">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
