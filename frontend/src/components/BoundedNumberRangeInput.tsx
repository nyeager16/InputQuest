import { useState, useEffect } from 'react';

type Props = {
  label?: string;
  minBound: number;
  maxBound: number;
  minValue: number;
  maxValue: number;
  onChange: (values: { min: number; max: number }) => void;
};

export default function BoundedNumberRangeInput({
  label,
  minBound,
  maxBound,
  minValue,
  maxValue,
  onChange,
}: Props) {
  const [localMin, setLocalMin] = useState(minValue.toString());
  const [localMax, setLocalMax] = useState(maxValue.toString());

  useEffect(() => {
    setLocalMin(minValue.toString());
    setLocalMax(maxValue.toString());
  }, [minValue, maxValue]);

  const clampMin = (val: number) => {
    let newMin = Math.max(minBound, Math.min(val, 95));
    if (newMin >= maxValue) newMin = maxValue - 1;
    return newMin;
  };

  const clampMax = (val: number) => {
    let newMax = Math.max(50, Math.min(val, maxBound));
    if (newMax <= minValue) newMax = minValue + 1;
    return newMax;
  };

  const commitMin = () => {
    const parsed = parseInt(localMin);
    if (!isNaN(parsed)) {
      const clamped = clampMin(parsed);
      onChange({ min: clamped, max: maxValue });
    } else {
      setLocalMin(minValue.toString());
    }
  };

  const commitMax = () => {
    const parsed = parseInt(localMax);
    if (!isNaN(parsed)) {
      const clamped = clampMax(parsed);
      onChange({ min: minValue, max: clamped });
    } else {
      setLocalMax(maxValue.toString());
    }
  };

  return (
    <div className="flex items-center gap-1">
      {label && <span className="text-sm font-medium">{label}:</span>}

      <input
        type="number"
        className="w-12 px-1 py-0.5 text-sm text-center border rounded"
        value={localMin}
        onChange={(e) => {
          const val = e.target.value;
          if (parseInt(val) <= 100 || val === '') setLocalMin(val);
        }}
        onBlur={commitMin}
        onKeyDown={(e) => e.key === 'Enter' && commitMin()}
      />

      <span className="text-sm">–</span>

      <input
        type="number"
        className="w-12 px-1 py-0.5 text-sm text-center border rounded"
        value={localMax}
        onChange={(e) => {
          const val = e.target.value;
          if (parseInt(val) <= 100 || val === '') setLocalMax(val);
        }}
        onBlur={commitMax}
        onKeyDown={(e) => e.key === 'Enter' && commitMax()}
      />
    </div>
  );
}
