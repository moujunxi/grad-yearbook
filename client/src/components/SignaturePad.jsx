import { useRef, useEffect, useCallback } from 'react';
import SignaturePadLib from 'signature_pad';

export default function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const padRef = useRef(null);
  const hasValue = !!value;

  // Initialize signature_pad instance
  const initPad = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Dispose previous instance
    if (padRef.current) {
      padRef.current.off();
      padRef.current = null;
    }
    const pad = new SignaturePadLib(canvas, {
      penColor: '#1e293b',
      backgroundColor: 'rgba(255,255,255,0)',
      minWidth: 1.5,
      maxWidth: 3,
    });
    pad.addEventListener('endStroke', () => {
      if (!pad.isEmpty()) {
        onChange(pad.toDataURL('image/png'));
      }
    });
    padRef.current = pad;
  }, [onChange]);

  // Resize canvas to match CSS display size, then init pad.
  // This fixes the coordinate offset: signature_pad uses CSS-relative
  // coordinates directly on the canvas context, so canvas.width/height
  // must equal the displayed pixel size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Only resize if dimensions differ (avoid unnecessary clear on re-render)
    if (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height)) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    if (!value) {
      initPad();
    }

    return () => {
      if (padRef.current) padRef.current.off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load existing signature image for display only (not during active drawing)
  useEffect(() => {
    if (value && canvasRef.current && !padRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clear = () => {
    if (padRef.current) {
      padRef.current.clear();
      onChange(null);
    }
  };

  const startRedraw = () => {
    if (padRef.current) padRef.current.off();
    padRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onChange(null);
    setTimeout(initPad, 0);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden w-full max-w-[320px]"
        style={{ height: 120, touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ touchAction: 'none' }}
        />
        {!hasValue && (
          <p className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm pointer-events-none select-none">
            在此手写签名
          </p>
        )}
      </div>
      <div className="flex gap-3">
        {hasValue ? (
          <>
            <button type="button" onClick={startRedraw}
              className="text-xs text-indigo-600 hover:underline">重新绘制</button>
            <button type="button" onClick={() => { if (padRef.current) { padRef.current.clear(); } onChange(null); }}
              className="text-xs text-red-500 hover:underline">清除</button>
          </>
        ) : (
          <button type="button" onClick={clear}
            className="text-xs text-gray-400 hover:text-gray-600">清除重画</button>
        )}
      </div>
    </div>
  );
}
