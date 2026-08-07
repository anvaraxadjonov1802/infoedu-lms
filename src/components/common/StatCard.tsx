import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconTextColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-indigo-50',
  iconTextColor = 'text-indigo-600',
  trend,
}) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
          <div className="flex items-end justify-between mt-2 gap-2">
            <span className="text-2xl font-bold text-slate-900 leading-none">{value}</span>
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-1.5">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${iconBgColor} ${iconTextColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs font-medium">
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
              trend.isPositive ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {trend.value}
          </span>
          <span className="text-slate-400 text-[11px]">o‘tgan haftaga nisbatan</span>
        </div>
      )}
    </div>
  );
};
