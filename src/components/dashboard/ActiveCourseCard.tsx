import React from 'react';
import { Course } from '../../types/lms';
import { useLMS } from '../../context/LMSContext';
import { ProgressBar } from '../common/ProgressBar';
import { PlayCircle, Clock, BookOpen, ChevronRight } from 'lucide-react';

interface ActiveCourseCardProps {
  course: Course;
}

export const ActiveCourseCard: React.FC<ActiveCourseCardProps> = ({ course }) => {
  const { navigateTo } = useLMS();

  // Find next available lesson or current module
  const currentModule = course.modules.find((m) => m.lessons.some((l) => !l.isCompleted)) || course.modules[0];
  const nextLesson = currentModule?.lessons.find((l) => !l.isCompleted) || currentModule?.lessons[0];

  const handleContinue = () => {
    if (nextLesson) {
      if (nextLesson.type === 'theory') {
        navigateTo('theory', { lessonId: nextLesson.id });
      } else if (nextLesson.type === 'presentation') {
        navigateTo('presentations', { lessonId: nextLesson.id });
      } else if (nextLesson.type === 'video') {
        navigateTo('videos', { lessonId: nextLesson.id });
      } else if (nextLesson.type === 'test') {
        navigateTo('tests');
      }
    } else {
      navigateTo('course_detail', { courseId: course.id });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Cover & Category Badge */}
        <div className="relative h-36 rounded-xl overflow-hidden mb-3 bg-slate-100">
          <img
            src={course.coverImage}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-semibold tracking-wide">
            {course.category}
          </div>
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold">
            {course.code}
          </div>
        </div>

        {/* Course Info */}
        <h3 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {course.title}
        </h3>

        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
          <img
            src={course.teacher.avatarUrl}
            alt={course.teacher.name}
            className="w-5 h-5 rounded-full object-cover border border-slate-200"
          />
          <span className="truncate">{course.teacher.name}</span>
        </div>

        {/* Current Module Info */}
        {currentModule && (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Joriy Modul</p>
            <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">{currentModule.title}</p>
            {nextLesson && (
              <p className="text-[11px] text-indigo-600 font-medium truncate mt-0.5">
                Keyingi: {nextLesson.title}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Progress & Actions Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
        <ProgressBar progress={course.progressPercentage} size="sm" color="indigo" />

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigateTo('course_detail', { courseId: course.id })}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Mundarija</span>
          </button>

          <button
            onClick={handleContinue}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-500/20 transition-all flex items-center gap-1.5"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Davom ettirish</span>
          </button>
        </div>
      </div>
    </div>
  );
};
