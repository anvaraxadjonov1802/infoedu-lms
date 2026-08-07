import React from 'react';

interface CircularProgressProps {
  progress: number; // 0 to 100
  size?: number; // size in px
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 140,
  strokeWidth = 10,
  label,
  sublabel,
  color = '#2563eb', // blue-600
}) => {
  const clamped = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-100"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">{clamped}%</span>
        {label && <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>}
        {sublabel && <span className="text-[10px] text-slate-400 mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
};
