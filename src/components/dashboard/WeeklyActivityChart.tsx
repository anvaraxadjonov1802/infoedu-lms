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
  const { weeklyActivities } = useLMS();
  const chartData = weeklyActivities.map((activity) => ({
    name: activity.dayShort,
    daqiqa: activity.minutesSpent,
    darslar: activity.lessonsCompleted,
    testlar: activity.testsCompleted,
  }));

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
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
              }}
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
