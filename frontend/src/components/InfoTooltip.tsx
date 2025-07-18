import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

type InfoTooltipProps = {
  message: string;
};

export default function InfoTooltip({ message }: InfoTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (showTooltip && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top + rect.height / 2 + window.scrollY,
        left: rect.right + 8 + window.scrollX, // 8px offset to the right
      });
    }
  }, [showTooltip]);

  return (
    <>
      <button
        ref={ref}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="ml-2 text-gray-500 hover:text-gray-800"
      >
        <Info className="w-5 h-5" />
      </button>

      {showTooltip && tooltipPos &&
        createPortal(
          <div
            style={{
              position: 'absolute',
              top: tooltipPos.top,
              left: tooltipPos.left,
              transform: 'translateY(-50%)',
              zIndex: 1000,
              whiteSpace: 'nowrap',
            }}
            className="px-3 py-1 text-xs text-gray-800 bg-white border border-gray-200 rounded shadow-sm"
          >
            {message}
          </div>,
          document.body
        )}
    </>
  );
}
