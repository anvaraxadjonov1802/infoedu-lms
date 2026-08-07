import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TestTimerProps {
  initialMinutes: number;
  onTimeUp: () => void;
  onRemainingTimeChange?: (formatted: string) => void;
}

export const TestTimer: React.FC<TestTimerProps> = ({
  initialMinutes,
  onTimeUp,
  onRemainingTimeChange,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        const mins = Math.floor(next / 60);
        const secs = next % 60;
        const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        if (onRemainingTimeChange) onRemainingTimeChange(formatted);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onTimeUp, onRemainingTimeChange]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const isWarning = secondsLeft < 120; // < 2 mins

  return (
    <div
      className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold font-mono flex items-center gap-2 transition-colors ${
        isWarning
          ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
          : 'bg-slate-100 border-slate-200 text-slate-800'
      }`}
    >
      {isWarning ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <Clock className="w-4 h-4 text-slate-500" />}
      <span>Qolgan vaqt: {formatted}</span>
    </div>
  );
};
