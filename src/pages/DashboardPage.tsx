import React from 'react';
import type { Test } from '../types/lms';
import { useLMS } from '../context/LMSContext';
import { StatCard } from '../components/common/StatCard';
import { OverallProgressCard } from '../components/dashboard/OverallProgressCard';
import { ActiveCourseCard } from '../components/dashboard/ActiveCourseCard';
import { WeeklyActivityChart } from '../components/dashboard/WeeklyActivityChart';
import { RecentResultsTable } from '../components/dashboard/RecentResultsTable';
import {
  BookOpen,
  CheckCircle2,
  TrendingUp,
  FileQuestion,
  Award,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, courses, tests, testResults, navigateTo } = useLMS();

  const activeCourses = courses.filter((c) => c.status === 'in_progress');
  const testList = Object.values(tests) as Test[];
  const availableTests = testList.filter((test) => test.attemptsUsed < test.attemptsAllowed && test.status !== 'passed');
  const nextTests = availableTests.slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-lg shadow-indigo-500/10 gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Xush kelibsiz, {user.fullName.split(' ')[0]}! 👋</h2>
          <p className="text-indigo-100 opacity-90 text-sm">
            Bugun o‘qish uchun ajoyib kun. Sizda {activeCourses.length} ta faol kurs va {user.completedLessonsCount} ta bajarilgan dars bor.
          </p>
        </div>
        <div className="flex gap-4 shrink-0 w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial text-center px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
            <p className="text-xs uppercase tracking-wider opacity-70 font-medium">Streak</p>
            <p className="text-xl font-bold">{user.studyStreakDays} kun</p>
          </div>
          <div className="flex-1 sm:flex-initial text-center px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
            <p className="text-xs uppercase tracking-wider opacity-70 font-medium">Faol test</p>
            <p className="text-xl font-bold">{availableTests.length} ta</p>
          </div>
        </div>
      </div>

      {/* 6 Overview Statistic Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Jami Kurslar"
          value={courses.length}
          subtitle="Faol talaba"
          icon={BookOpen}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-600"
        />
        <StatCard
          title="Tugallangan"
          value={user.completedLessonsCount}
          subtitle={`Jami ${user.totalLessonsCount} darsdan`}
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
        />
        <StatCard
          title="O‘zlashtirish"
          value={`${user.overallProgress}%`}
          subtitle="Barcha fanlar"
          icon={TrendingUp}
          iconBgColor="bg-indigo-50"
          iconTextColor="text-indigo-600"
        />
        <StatCard
          title="Ishlangan Testlar"
          value={testResults.length}
          subtitle={`Mavjud ${testList.length} ta test`}
          icon={FileQuestion}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
        />
        <StatCard
          title="O‘rtacha Natija"
          value={`${user.averageScore}%`}
          subtitle="Test bali"
          icon={Award}
          iconBgColor="bg-purple-50"
          iconTextColor="text-purple-600"
        />
        <StatCard
          title="Sarflangan Vaqt"
          value={`${Math.floor(user.totalStudyMinutes / 60)}s`}
          subtitle="O‘quv vaqti"
          icon={Clock}
          iconBgColor="bg-rose-50"
          iconTextColor="text-rose-600"
        />
      </div>

      {/* Large Overall Progress Card */}
      <OverallProgressCard />

      {/* "O‘qishni davom ettirish" Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">O‘qishni Davom Ettirish</h2>
            <p className="text-xs text-slate-400 mt-0.5">Jarayondagi faol darslar va modullar</p>
          </div>
          <button
            onClick={() => navigateTo('courses')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Barcha kurslar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCourses.map((c) => (
            <ActiveCourseCard key={c.id} course={c} />
          ))}
        </div>
      </div>

      {/* Charts & Agenda Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Bar Chart (2 Cols) */}
        <div className="lg:col-span-2">
          <WeeklyActivityChart />
        </div>

        {/* Upcoming Tests Widget (1 Col) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-500" />
              Navbatdagi Testlar
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
              {availableTests.length} ta mavjud
            </span>
          </div>

          <div className="space-y-3">
            {nextTests.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-700">
                Hozircha topshirilishi kerak bo‘lgan test yo‘q.
              </div>
            ) : nextTests.map((test) => (
              <div key={test.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2 font-bold text-slate-800">
                  <span>{test.title}</span>
                  <span className="text-amber-600 text-[10px] shrink-0">{test.timeLimitMinutes} daqiqa</span>
                </div>
                <p className="text-[11px] text-slate-500">{test.courseName} • {test.questionCount} savol</p>
                <button
                  onClick={() => navigateTo('test_taking', { testId: test.id })}
                  className="mt-2 text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Testni topshirish</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Results Table */}
      <RecentResultsTable />
    </div>
  );
};
