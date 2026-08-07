import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'emerald' | 'amber' | 'indigo' | 'purple';
  animate?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = true,
  size = 'md',
  color = 'blue',
  animate = true,
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3.5' : 'h-2.5';

  const colorClass =
    color === 'emerald'
      ? 'bg-emerald-500'
      : color === 'amber'
      ? 'bg-amber-500'
      : color === 'indigo'
      ? 'bg-indigo-600'
      : color === 'purple'
      ? 'bg-purple-600'
      : 'bg-blue-600';

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1">
          <span>O‘zlashtirish</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`${heightClass} ${colorClass} rounded-full transition-all duration-500 ease-out ${
            animate ? 'transform-gpu' : ''
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
