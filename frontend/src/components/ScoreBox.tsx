import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type ScoreBoxProps = {
  score: number;
};

export default function ScoreBox({ score }: ScoreBoxProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const tooltipText = `${score}% of words in this video are saved in My Vocab`;

  useEffect(() => {
    if (showTooltip && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top + window.scrollY - 32,
        left: rect.left + rect.width / 2 + window.scrollX,
      });
    }
  }, [showTooltip]);

  return (
    <>
      <div
        ref={ref}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="min-w-[40px] px-2 py-1 text-xs text-center rounded bg-gray-100 text-gray-700 shadow-sm"
      >
        {score}
      </div>

      {showTooltip && tooltipPos &&
        createPortal(
          <div
            style={{
              position: 'absolute',
              top: tooltipPos.top,
              left: tooltipPos.left,
              transform: 'translateX(-50%)',
              zIndex: 1000,
            }}
            className="px-3 py-1 text-xs text-gray-800 bg-white border border-gray-200 rounded shadow-sm"
          >
            {tooltipText}
          </div>,
          document.body
        )}
    </>
  );
}
