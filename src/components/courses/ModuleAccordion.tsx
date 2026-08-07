import React, { useState } from 'react';
import { Module, Lesson } from '../../types/lms';
import { useLMS } from '../../context/LMSContext';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Presentation,
  Video,
  FileQuestion,
  ClipboardList,
  NotebookPen,
  Lock,
  CheckCircle2,
  Clock,
  PlayCircle,
} from 'lucide-react';

interface ModuleAccordionProps {
  module: Module;
  moduleIndex: number;
}

export const ModuleAccordion: React.FC<ModuleAccordionProps> = ({ module, moduleIndex }) => {
  const [isOpen, setIsOpen] = useState(moduleIndex === 0);
  const { navigateTo, addToast } = useLMS();

  const completedCount = module.lessons.filter((l) => l.isCompleted).length;

  const getLessonIcon = (type: Lesson['type']) => {
    switch (type) {
      case 'theory':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'practical':
        return <ClipboardList className="w-4 h-4 text-emerald-600" />;
      case 'independent':
        return <NotebookPen className="w-4 h-4 text-cyan-700" />;
      case 'presentation':
        return <Presentation className="w-4 h-4 text-purple-600" />;
      case 'video':
        return <Video className="w-4 h-4 text-rose-600" />;
      case 'test':
        return <FileQuestion className="w-4 h-4 text-amber-600" />;
    }
  };

  const getLessonTypeBadge = (type: Lesson['type']) => {
    switch (type) {
      case 'theory':
        return 'Nazariya';
      case 'practical':
        return 'Amaliy ish';
      case 'independent':
        return 'Mustaqil ish';
      case 'presentation':
        return 'Taqdimot';
      case 'video':
        return 'Video';
      case 'test':
        return 'Test';
    }
  };

  const handleLessonOpen = (lesson: Lesson) => {
    if (lesson.isLocked) {
      addToast('Dars qulflangan', 'Ushbu darsni ochish uchun avvalgi topshiriqlarni yakunlang.', 'warning');
      return;
    }

    if (lesson.type === 'theory' || lesson.type === 'practical' || lesson.type === 'independent') {
      navigateTo('theory', lesson.theoryId ? { theoryId: lesson.theoryId } : { lessonId: lesson.id });
    } else if (lesson.type === 'presentation') {
      navigateTo('presentations', { lessonId: lesson.id });
    } else if (lesson.type === 'video') {
      navigateTo('videos', { lessonId: lesson.id });
    } else if (lesson.type === 'test') {
      if (lesson.testId) {
        navigateTo('test_taking', { testId: lesson.testId });
      } else {
        navigateTo('tests');
      }
    }
  };

  return (
    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden mb-3 shadow-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
            {moduleIndex + 1}
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800">{module.title}</h4>
            <p className="text-xs text-slate-400 mt-0.5">{module.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">
            {completedCount}/{module.lessons.length} bajarildi
          </span>
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/50">
          {module.lessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => handleLessonOpen(lesson)}
              className={`p-3 sm:px-5 flex items-center justify-between gap-3 transition-colors ${
                lesson.isLocked
                  ? 'opacity-60 cursor-not-allowed bg-slate-100/50'
                  : 'hover:bg-blue-50/50 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-white border border-slate-200 shrink-0">
                  {getLessonIcon(lesson.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700">
                      {getLessonTypeBadge(lesson.type)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {lesson.durationMinutes} min
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-800 truncate mt-1">{lesson.title}</h5>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {lesson.isCompleted ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Bajarildi
                  </span>
                ) : lesson.isLocked ? (
                  <span className="inline-flex items-center gap-1 text-slate-400 font-medium text-xs bg-slate-200/60 px-2.5 py-1 rounded-full">
                    <Lock className="w-3.5 h-3.5" /> Qulflangan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-blue-600 font-semibold text-xs bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors">
                    <PlayCircle className="w-3.5 h-3.5" /> Boshlash
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
