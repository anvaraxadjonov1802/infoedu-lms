import React from 'react';
import { useLMS } from '../context/LMSContext';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ModuleAccordion } from '../components/courses/ModuleAccordion';
import { ProgressBar } from '../components/common/ProgressBar';
import { EmptyState } from '../components/common/EmptyState';
import { MediaImage } from '../components/common/MediaImage';
import {
  BookOpen,
  Layers,
  Clock,
  PlayCircle,
} from 'lucide-react';

export const CourseDetailPage: React.FC = () => {
  const { courses, pageParams, navigateTo } = useLMS();

  const courseId = pageParams.courseId || courses[0]?.id;
  const course = courses.find((c) => c.id === courseId) || courses[0];

  if (!course) {
    return (
      <EmptyState
        title="Kurs topilmadi"
        description="So‘ralgan kurs ID tizimda mavjud emas."
        actionLabel="Kurslarga qaytish"
        onAction={() => navigateTo('courses')}
      />
    );
  }

  const nextModule = course.modules.find((m) => m.lessons.some((l) => !l.isCompleted)) || course.modules[0];
  const nextLesson = nextModule?.lessons.find((l) => !l.isCompleted) || nextModule?.lessons[0];

  const handleStartStudy = () => {
    if (!nextLesson) return;

    if (nextLesson.type === 'theory' || nextLesson.type === 'practical' || nextLesson.type === 'independent') {
      navigateTo('theory', nextLesson.theoryId ? { theoryId: nextLesson.theoryId } : { lessonId: nextLesson.id });
    } else if (nextLesson.type === 'presentation') {
      navigateTo('presentations', { lessonId: nextLesson.id });
    } else if (nextLesson.type === 'video') {
      navigateTo('videos', { lessonId: nextLesson.id });
    } else if (nextLesson.type === 'test') {
      if (nextLesson.testId) navigateTo('test_taking', { testId: nextLesson.testId });
      else navigateTo('tests');
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Mening kurslarim', page: 'courses' }, { label: course.title }]} />

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="relative rounded-2xl overflow-hidden h-52 lg:h-auto bg-slate-100">
            <MediaImage
              src={course.coverImage}
              alt={course.title}
              label={course.title}
              variant="course"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md text-white font-bold text-xs">
              {course.code}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                  {course.category}
                </span>
                <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                  {course.level}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{course.title}</h1>
              <p className="text-xs text-slate-500 leading-relaxed">{course.description}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <MediaImage
                  src={course.teacher.avatarUrl}
                  alt={course.teacher.name}
                  label={course.teacher.name}
                  variant="avatar"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0 text-xs"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{course.teacher.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{course.teacher.title} • {course.teacher.email}</p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600 border-l border-slate-200 pl-4">
                <span className="flex items-center gap-1"><Layers className="w-4 h-4 text-slate-400" /> {course.totalModulesCount} modul</span>
                <span className="flex items-center gap-1"><BookOpen className="w-4 h-4 text-slate-400" /> {course.totalLessonsCount} material</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-slate-400" /> {course.estimatedStudyHours} soat</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <ProgressBar progress={course.progressPercentage} size="md" />

              <button
                onClick={handleStartStudy}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-4 h-4" />
                <span>O‘qishni davom ettirish</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Kurs modullari va materiallar</h2>
          <p className="text-xs text-slate-400 mt-0.5">Nazariya, amaliy ish, mustaqil ish, taqdimot, video va testlar bir joyda</p>
        </div>

        {course.modules.length === 0 ? (
          <EmptyState
            title="Modullar yuklanmagan"
            description="Ushbu kurs uchun hali dars modullari e’lon qilinmadi."
          />
        ) : (
          course.modules.map((m, idx) => (
            <ModuleAccordion key={m.id} module={m} moduleIndex={idx} />
          ))
        )}
      </div>
    </div>
  );
};
