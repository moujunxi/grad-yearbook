export default function TagSelector({ mode, options, selected, onChange, label }) {
  const isMulti = mode === 'multi';
  const sel = isMulti ? (selected || []) : selected;

  const toggle = (val) => {
    if (isMulti) {
      const arr = sel.includes(val) ? sel.filter((v) => v !== val) : [...sel, val];
      onChange(arr);
    } else {
      onChange(sel === val ? '' : val);
    }
  };

  return (
    <div>
      {label && <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = isMulti ? sel.includes(o.value) : sel === o.value;
          return (
            <button key={o.value} type="button" onClick={() => toggle(o.value)}
              className={`px-3 py-1 rounded-full text-sm border transition
                ${active ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'border-gray-200 text-gray-600 hover:border-indigo-200'}`}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
