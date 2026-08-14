import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { TheoryLessonContent } from '../../types/lms';
import { useLMS } from '../../context/LMSContext';
import { restoreMissingDocxImages } from './docxImageFallback';
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import './word-document.css';

interface WordTheoryReaderProps {
  theoryData: TheoryLessonContent;
  onNextLesson?: () => void | Promise<void>;
  onPrevLesson?: () => void;
}

const isDocxAttachment = (attachment: TheoryLessonContent['attachments'][number]) => {
  const type = (attachment.type || '').toLowerCase();
  const name = (attachment.name || '').toLowerCase();
  const url = (attachment.downloadUrl || '').toLowerCase().split('?')[0];
  return type === 'docx' || name.endsWith('.docx') || url.endsWith('.docx');
};

export const WordTheoryReader: React.FC<WordTheoryReaderProps> = ({
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [renderError, setRenderError] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesText, setNotesText] = useState(theoryData.notes || '');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const docxAttachment = theoryData.attachments.find(isDocxAttachment);

  useEffect(() => {
    setNotesText(theoryData.notes || '');
  }, [theoryData.id, theoryData.notes]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const renderDocument = async () => {
      if (!containerRef.current || !docxAttachment?.downloadUrl) {
        setIsRendering(false);
        setRenderError('Original DOCX fayli topilmadi.');
        return;
      }

      setIsRendering(true);
      setRenderError('');
      containerRef.current.innerHTML = '';

      try {
        const response = await fetch(docxAttachment.downloadUrl, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`DOCX yuklanmadi (${response.status}).`);
        }
        const blob = await response.blob();
        if (cancelled || !containerRef.current) return;

        await renderAsync(blob, containerRef.current, containerRef.current, {
          className: 'infoedu-docx',
          inWrapper: true,
          breakPages: false,
          ignoreHeight: true,
          ignoreWidth: false,
          ignoreFonts: false,
          ignoreLastRenderedPageBreak: true,
          experimental: true,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          renderComments: false,
          renderAltChunks: true,
        });

        if (cancelled || !containerRef.current) return;

        const imageReport = await restoreMissingDocxImages(blob, containerRef.current);
        if (imageReport.media > 0 && imageReport.restored === 0) {
          const visibleImages = containerRef.current.querySelectorAll('img[src], svg image[href], svg image[xlink\\:href]').length;
          if (visibleImages === 0 && imageReport.unsupported > 0) {
            console.warn('DOCX ichida brauzer to‘g‘ridan-to‘g‘ri ko‘rsata olmaydigan rasm formatlari bor.', imageReport);
          }
        }

        if (!cancelled) setIsRendering(false);
      } catch (error) {
        if (controller.signal.aborted || cancelled) return;
        setIsRendering(false);
        setRenderError(error instanceof Error ? error.message : 'DOCX hujjatini ochib bo‘lmadi.');
      }
    };

    void renderDocument();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [docxAttachment?.downloadUrl, theoryData.id]);

  const handleSaveNotes = () => {
    saveTheoryNotes(theoryData.id, notesText);
    setShowNotesModal(false);
  };

  const handleFinishLesson = async () => {
    if (isFinishing || isCompleted) return;
    setIsFinishing(true);
    try {
      await markLessonCompleted(theoryData.courseId || '', theoryData.lessonId);
      setIsCompleted(true);
    } finally {
      setIsFinishing(false);
    }
  };

  const handleNext = async () => {
    if (!onNextLesson || isFinishing) return;
    setIsFinishing(true);
    try {
      await onNextLesson();
      setIsCompleted(true);
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 sticky top-16 z-20">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-600">
            <FileText className="w-3.5 h-3.5" />
            Original Word hujjati
          </div>
          <h2 className="mt-1 text-sm sm:text-base font-bold text-slate-900 truncate">{theoryData.title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => toggleTheoryBookmark(theoryData.id)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              theoryData.isBookmarked
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {theoryData.isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            <span>{theoryData.isBookmarked ? 'Saqlangan' : 'Xatcho‘p'}</span>
          </button>

          <button
            onClick={() => setShowNotesModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>Qaydlarim</span>
          </button>

          {docxAttachment?.downloadUrl && (
            <a
              href={docxAttachment.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>DOCX</span>
            </a>
          )}

          <button
            onClick={handleFinishLesson}
            disabled={isFinishing || isCompleted}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:cursor-default ${
              isCompleted
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
            }`}
          >
            {isFinishing && !isCompleted ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            <span>{isCompleted ? 'Dars tugallandi' : 'Darsni tugatdim'}</span>
          </button>
        </div>
      </div>

      <div className="word-document-shell rounded-2xl border border-slate-200 bg-[#eef1f5] overflow-hidden shadow-sm">
        {isRendering && (
          <div className="min-h-[360px] flex items-center justify-center gap-3 text-sm font-semibold text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            Word hujjati yuklanmoqda...
          </div>
        )}

        {renderError && !isRendering && (
          <div className="min-h-[360px] p-8 flex flex-col items-center justify-center text-center gap-3">
            <FileText className="w-10 h-10 text-slate-300" />
            <p className="font-bold text-slate-700">Word hujjatini ko‘rsatib bo‘lmadi</p>
            <p className="text-xs text-slate-500 max-w-lg">{renderError}</p>
            {docxAttachment?.downloadUrl && (
              <a
                href={docxAttachment.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
              >
                Original DOCXni ochish
              </a>
            )}
          </div>
        )}

        <div ref={containerRef} className={isRendering || renderError ? 'hidden' : 'block'} />
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <button
          onClick={onPrevLesson}
          disabled={!onPrevLesson || isFinishing}
          className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Oldingi dars
        </button>

        <button
          onClick={handleNext}
          disabled={!onNextLesson || isFinishing}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 flex items-center gap-2"
        >
          {isFinishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Keyingi dars
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {showNotesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-800">Shaxsiy qaydlarim</h3>
            <textarea
              rows={6}
              value={notesText}
              onChange={(event) => setNotesText(event.target.value)}
              placeholder="Eslatmalaringizni shu yerga yozing..."
              className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
