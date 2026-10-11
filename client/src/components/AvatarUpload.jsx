import { useRef, useState, useEffect, useCallback } from 'react';

export default function AvatarUpload({ value, onChange, error }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [value]);

  const handle = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) onChange(f);
    e.target.value = '';
  }, [onChange]);

  return (
    <div>
      {preview ? (
        <div className="relative w-24 h-24 mx-auto">
          <img src={preview} className="w-24 h-24 rounded-full object-cover border-2 border-indigo-300" />
          <button type="button" onClick={() => onChange(null)}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-8 h-8 text-sm leading-none flex items-center justify-center">✕</button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="w-24 h-24 mx-auto border-2 border-dashed border-gray-300 rounded-full
                     flex items-center justify-center text-3xl text-gray-400 hover:border-indigo-400">
          📷
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handle} className="hidden" />
      {error && <p className="text-red-500 text-xs text-center mt-1">{error}</p>}
    </div>
  );
}
