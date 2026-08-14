import React from 'react';
import { useLMS } from '../../context/LMSContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Calendar } from 'lucide-react';

export const WeeklyActivityChart: React.FC = () => {
  const { weeklyActivities, theme } = useLMS();
  const isDark = theme === 'dark';
  const chartData = weeklyActivities.map((activity) => ({
    name: activity.dayShort,
    daqiqa: activity.minutesSpent,
    darslar: activity.lessonsCompleted,
    testlar: activity.testsCompleted,
  }));

  const gridColor = isDark ? '#273449' : '#f1f5f9';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBackground = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
  const tooltipText = isDark ? '#e2e8f0' : '#1e293b';

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-xs">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Haftalik O‘qish Faolligi
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Backend hisoblagan so‘nggi 7 kunlik faollik</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: tickColor }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: tickColor }} />
            <Tooltip
              cursor={{ fill: isDark ? 'rgba(51, 65, 85, 0.28)' : 'rgba(241, 245, 249, 0.7)' }}
              contentStyle={{
                backgroundColor: tooltipBackground,
                color: tooltipText,
                borderRadius: '12px',
                border: `1px solid ${tooltipBorder}`,
                boxShadow: isDark ? '0 14px 30px rgba(0, 0, 0, 0.35)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
              }}
              labelStyle={{ color: tooltipText, fontWeight: 700 }}
              itemStyle={{ color: tooltipText }}
              formatter={(value: number, name: string) => {
                if (name === 'daqiqa') return [`${value} daqiqa`, 'O‘qish vaqti'];
                if (name === 'darslar') return [value, 'Tugallangan darslar'];
                return [value, 'Testlar'];
              }}
            />
            <Bar dataKey="daqiqa" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
