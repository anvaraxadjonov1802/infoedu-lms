import React from 'react';
import { useLMS } from '../context/LMSContext';
import { OverallProgressCard } from '../components/dashboard/OverallProgressCard';
import { WeeklyActivityChart } from '../components/dashboard/WeeklyActivityChart';
import { ProgressBar } from '../components/common/ProgressBar';
import { TrendingUp, Award, BookOpen, Clock } from 'lucide-react';

export const LearningProgressPage: React.FC = () => {
  const { courses, user } = useLMS();

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">O‘qish Jarayoni va Statistika</h1>
        <p className="text-xs text-slate-500 mt-1">Barcha fanlar bo‘yicha o‘zlashtirish, dars vaqtlarining chuqur tahlili</p>
      </div>

      <OverallProgressCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Progress Breakdown List */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Fanlar Bo‘yicha O‘zlashtirish
          </h3>

          <div className="space-y-4">
            {courses.map((c) => (
              <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>{c.title}</span>
                  <span className="text-blue-600">{c.progressPercentage}%</span>
                </div>
                <ProgressBar progress={c.progressPercentage} size="sm" />
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{c.completedLessonsCount}/{c.totalLessonsCount} darslar</span>
                  <span>O‘qituvchi: {c.teacher.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Activity Chart */}
        <WeeklyActivityChart />
      </div>
    </div>
  );
};
