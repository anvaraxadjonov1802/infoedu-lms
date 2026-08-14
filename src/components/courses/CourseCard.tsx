import React from 'react';
import { Course } from '../../types/lms';
import { useLMS } from '../../context/LMSContext';
import { ProgressBar } from '../common/ProgressBar';
import { MediaImage } from '../common/MediaImage';
import { BookOpen, Layers, Clock, ArrowRight } from 'lucide-react';

interface CourseCardProps {
  course: Course;
  viewMode?: 'grid' | 'list';
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, viewMode = 'grid' }) => {
  const { navigateTo } = useLMS();

  const getStatusBadge = (status: Course['status']) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Tugallangan</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Jarayonda</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Boshlanmagan</span>;
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs hover:border-indigo-200 transition-all flex flex-col sm:flex-row items-center gap-4 group">
        <MediaImage
          src={course.coverImage}
          alt={course.title}
          label={course.title}
          variant="course"
          className="w-full sm:w-48 h-32 rounded-xl object-cover shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            {getStatusBadge(course.status)}
            <span className="text-[11px] text-slate-400">{course.code} • {course.level}</span>
          </div>
          <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
            {course.title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-1">{course.description}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-slate-400" /> {course.totalModulesCount} modul</span>
            <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-slate-400" /> {course.totalLessonsCount} dars</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> {course.estimatedStudyHours} soat</span>
          </div>
        </div>
        <div className="shrink-0 w-full sm:w-48 text-right space-y-3">
          <ProgressBar progress={course.progressPercentage} size="sm" color="indigo" />
          <button
            onClick={() => navigateTo('course_detail', { courseId: course.id })}
            className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <span>Kursni ochish</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between group">
      <div>
        <div className="relative h-40 rounded-xl overflow-hidden mb-3 bg-slate-100">
          <MediaImage
            src={course.coverImage}
            alt={course.title}
            label={course.title}
            variant="course"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 left-2">{getStatusBadge(course.status)}</div>
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-bold">
            {course.code}
          </div>
        </div>

        <h3 className="font-bold text-base text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {course.title}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{course.description}</p>

        <div className="flex items-center gap-2 mt-3 text-xs text-slate-600">
          <MediaImage
            src={course.teacher.avatarUrl}
            alt={course.teacher.name}
            label={course.teacher.name}
            variant="avatar"
            className="w-5 h-5 rounded-full object-cover border border-slate-200 text-[8px]"
          />
          <span className="truncate">{course.teacher.name}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 p-2 rounded-xl bg-slate-50 text-[11px] text-slate-600">
          <div className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>{course.totalModulesCount} modul</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>{course.totalLessonsCount} dars</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
        <ProgressBar progress={course.progressPercentage} size="sm" color="indigo" />

        <button
          onClick={() => navigateTo('course_detail', { courseId: course.id })}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5"
        >
          <span>Kursni ochish</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
