import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Code2 } from 'lucide-react';

interface MediaImageProps {
  src?: string | null;
  alt: string;
  variant: 'avatar' | 'course';
  className?: string;
  label?: string;
}

const initialsFor = (value: string) => {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'IE';
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

export const MediaImage: React.FC<MediaImageProps> = ({
  src,
  alt,
  variant,
  className = '',
  label,
}) => {
  const normalizedSrc = String(src || '').trim();
  const [failed, setFailed] = useState(!normalizedSrc);
  const initials = useMemo(() => initialsFor(label || alt), [label, alt]);

  useEffect(() => {
    setFailed(!normalizedSrc);
  }, [normalizedSrc]);

  if (!failed && normalizedSrc) {
    return (
      <img
        src={normalizedSrc}
        alt={alt}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }

  if (variant === 'avatar') {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold select-none ${className}`}
      >
        <span className="leading-none">{initials}</span>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative overflow-hidden bg-gradient-to-br from-indigo-700 via-blue-600 to-cyan-500 text-white flex items-center justify-center ${className}`}
    >
      <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-14 -left-8 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '18px 18px' }} />
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-5">
        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
          <Code2 className="w-7 h-7" />
        </div>
        <p className="mt-3 text-sm font-extrabold tracking-tight">{label || 'Dasturlash'}</p>
        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-white/80 uppercase tracking-[0.16em]">
          <BookOpen className="w-3 h-3" /> InfoEdu LMS
        </div>
      </div>
    </div>
  );
};
