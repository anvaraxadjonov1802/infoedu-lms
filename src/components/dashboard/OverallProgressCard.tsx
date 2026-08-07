import React from 'react';
import { useLMS } from '../../context/LMSContext';
import { CircularProgress } from '../common/CircularProgress';
import { TrendingUp, CheckCircle, BookOpen, Clock } from 'lucide-react';

export const OverallProgressCard: React.FC = () => {
  const { user } = useLMS();

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-lg border border-indigo-700/40 relative overflow-hidden">
      {/* Subtle Background Glow Decorative Pattern */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Stats & Messaging */}
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-indigo-100">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>O‘zlashtirish o‘sishi +12% haftasiga</span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Umumiy O‘quv Progressi</h2>
            <p className="text-xs text-indigo-200 mt-1 max-w-md leading-relaxed">
              Dasturiy injiniring va axborot texnologiyalari yo‘nalishi bo‘yicha belgilangan barcha o‘quv rejalarini bajaring.
            </p>
          </div>

          {/* Quick Metrics Row */}
          <div className="grid grid-cols-3 gap-3 pt-2 max-w-md">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
              <p className="text-[10px] text-indigo-200 font-medium uppercase">Tugallangan</p>
              <p className="text-base font-bold text-white mt-0.5">{user.completedLessonsCount} dars</p>
            </div>
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
              <p className="text-[10px] text-indigo-200 font-medium uppercase">Jami Darslar</p>
              <p className="text-base font-bold text-white mt-0.5">{user.totalLessonsCount} dars</p>
            </div>
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
              <p className="text-[10px] text-indigo-200 font-medium uppercase">Sarflangan Vaqt</p>
              <p className="text-base font-bold text-emerald-400 mt-0.5">
                {Math.floor(user.totalStudyMinutes / 60)}s {user.totalStudyMinutes % 60}m
              </p>
            </div>
          </div>
        </div>

        {/* Right Circular Gauge */}
        <div className="shrink-0 bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-md flex flex-col items-center justify-center">
          <CircularProgress
            progress={user.overallProgress}
            size={130}
            strokeWidth={10}
            label="Umumiy"
            sublabel="ko‘rsatkich"
            color="#818cf8"
          />
        </div>
      </div>
    </div>
  );
};
