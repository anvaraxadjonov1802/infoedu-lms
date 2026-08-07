import React, { useState } from 'react';
import { TheoryLessonContent } from '../../types/lms';
import { useLMS } from '../../context/LMSContext';
import { RichText } from '../common/RichText';
import {
  Bookmark,
  BookmarkCheck,
  FileText,
  Download,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  List,
  MessageSquare,
  Sparkles,
  Info,
  AlertTriangle,
  Code,
  AArrowDown,
  AArrowUp,
} from 'lucide-react';

interface TheoryReaderProps {
  theoryData: TheoryLessonContent;
  onNextLesson?: () => void;
  onPrevLesson?: () => void;
}

export const TheoryReader: React.FC<TheoryReaderProps> = ({
  theoryData,
  onNextLesson,
  onPrevLesson,
}) => {
  const {
    markLessonCompleted,
    toggleTheoryBookmark,
    saveTheoryNotes,
    addToast,
  } = useLMS();

  const [fontSize, setFontSize] = useState<number>(14); // 12px, 14px, 16px, 18px
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesText, setNotesText] = useState(theoryData.notes || '');
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSaveNotes = () => {
    saveTheoryNotes(theoryData.id, notesText);
    setShowNotesModal(false);
  };

  const handleFinishLesson = async () => {
    setIsCompleted(true);
    try {
      await markLessonCompleted(theoryData.courseId, theoryData.lessonId);
    } catch {
      setIsCompleted(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header Bar with Font Size & Action Controls */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 sticky top-16 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Shrift o‘lchami:</span>
          <button
            onClick={() => setFontSize((s) => Math.max(12, s - 2))}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
            title="Kichraytirish"
          >
            <AArrowDown className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-700 w-6 text-center">{fontSize}px</span>
          <button
            onClick={() => setFontSize((s) => Math.min(20, s + 2))}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
            title="Kattalashtirish"
          >
            <AArrowUp className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Bookmark button */}
          <button
            onClick={() => toggleTheoryBookmark(theoryData.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              theoryData.isBookmarked
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {theoryData.isBookmarked ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-amber-600" />
                <span>Saqlangan</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 text-slate-400" />
                <span>Xatcho‘p</span>
              </>
            )}
          </button>

          {/* Notes button */}
          <button
            onClick={() => setShowNotesModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>Qaydlarim</span>
          </button>

          {/* Mark Completed button */}
          <button
            onClick={handleFinishLesson}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isCompleted
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isCompleted ? 'Dars tugallandi!' : 'Darsni tugatdim'}</span>
          </button>
        </div>
      </div>

      {/* Main Reader Layout with TOC Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Column */}
        <div className="lg:col-span-3 p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          {/* Summary Box */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/60 text-blue-950 text-xs leading-relaxed">
            <span className="font-bold uppercase tracking-wider text-[10px] text-blue-600 block mb-1">
              Dars Xulosasi
            </span>
            {theoryData.summary}
          </div>

          {/* Sections List */}
          <div className="space-y-8" style={{ fontSize: `${fontSize}px` }}>
            {theoryData.sections.map((section) => (
              <div key={section.id} id={section.id} className="space-y-3 scroll-mt-24">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                  {section.title}
                </h3>
                <div className="text-slate-700 leading-relaxed">
                  <RichText text={section.contentMarkdown} />
                </div>

                {/* Callout Box if present */}
                {section.callout && (
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 my-3 text-xs leading-relaxed ${
                      section.callout.type === 'info'
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : section.callout.type === 'warning'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : section.callout.type === 'formula'
                        ? 'bg-purple-50 border-purple-200 text-purple-900 font-mono'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {section.callout.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
                      {section.callout.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                      {section.callout.type === 'formula' && <Sparkles className="w-5 h-5 text-purple-600" />}
                    </div>
                    <div>
                      <h5 className="font-bold text-xs">{section.callout.title}</h5>
                      <p className="mt-0.5">{section.callout.text}</p>
                    </div>
                  </div>
                )}

                {/* Code Snippet if present */}
                {section.codeSnippet && (
                  <div className="rounded-xl overflow-hidden bg-slate-900 text-slate-100 p-4 font-mono text-xs my-3 space-y-2 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1">
                        <Code className="w-3.5 h-3.5" /> {section.codeSnippet.language}
                      </span>
                      <span>Kodni ko‘chirish</span>
                    </div>
                    <pre className="overflow-x-auto">{section.codeSnippet.code}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Downloadable Attachments Section */}
          {theoryData.attachments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200 space-y-3">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" />
                Biriktirilgan fayllar va materiallar
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {theoryData.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{att.name}</p>
                      <p className="text-[10px] text-slate-400">{att.size}</p>
                    </div>
                    <a
                      href={att.downloadUrl || '#'}
                      target={att.downloadUrl && att.downloadUrl !== '#' ? '_blank' : undefined}
                      rel="noreferrer"
                      onClick={(e) => {
                        if (!att.downloadUrl || att.downloadUrl === '#') {
                          e.preventDefault();
                          addToast('Fayl mavjud emas', `${att.name} uchun yuklab olish havolasi biriktirilmagan.`, 'warning');
                        }
                      }}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Lesson Navigation */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={onPrevLesson}
              disabled={!onPrevLesson}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Oldingi dars</span>
            </button>

            <button
              onClick={onNextLesson}
              disabled={!onNextLesson}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              <span>Keyingi dars</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Sticky Table of Contents */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs sticky top-36">
            <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider flex items-center gap-2 mb-3">
              <List className="w-4 h-4 text-blue-600" />
              Mundarija
            </h4>
            <nav className="space-y-1 text-xs">
              {theoryData.sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block py-1.5 px-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 truncate transition-colors font-medium"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-800">Shaxsiy Qaydlarim</h3>
            <p className="text-xs text-slate-500">
              Ushbu dars bo‘yicha muhim tushunchalar va xulosalaringizni yozib qoldiring.
            </p>
            <textarea
              rows={5}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Eslatmalaringizni shu yerga yozing..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
