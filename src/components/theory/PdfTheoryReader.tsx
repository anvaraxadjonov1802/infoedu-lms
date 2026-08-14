import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { TheoryLessonContent } from '../../types/lms';
import { useLMS } from '../../context/LMSContext';
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
import './pdf-document.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfTheoryReaderProps {
  theoryData: TheoryLessonContent;
  onNextLesson?: () => void | Promise<void>;
  onPrevLesson?: () => void;
}

const isPreviewPdf = (attachment: TheoryLessonContent['attachments'][number]) => {
  const type = String(attachment.type || '').toLowerCase();
  const name = String(attachment.name || '').toLowerCase();
  const kind = String((attachment as any).kind || '').toLowerCase();
  return type === 'pdf' && (kind === 'word-preview' || name.endsWith('.pdf'));
};

const isOriginalDocx = (attachment: TheoryLessonContent['attachments'][number]) => {
  const type = String(attachment.type || '').toLowerCase();
  const name = String(attachment.name || '').toLowerCase();
  return type === 'docx' || name.endsWith('.docx');
};

export const PdfTheoryReader: React.FC<PdfTheoryReaderProps> = ({
  theoryData,
  onNextLesson,
  onPrevLesson,
}) => {
  const {
    markLessonCompleted,
    toggleTheoryBookmark,
    saveTheoryNotes,
  } = useLMS();

  const pagesRef = useRef<HTMLDivElement | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [renderError, setRenderError] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesText, setNotesText] = useState(theoryData.notes || '');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  const pdfAttachment = useMemo(
    () => theoryData.attachments.find(isPreviewPdf),
    [theoryData.attachments],
  );
  const docxAttachment = useMemo(
    () => theoryData.attachments.find(isOriginalDocx),
    [theoryData.attachments],
  );

  useEffect(() => {
    setNotesText(theoryData.notes || '');
  }, [theoryData.id, theoryData.notes]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof pdfjs.getDocument> | null = null;
    let observer: ResizeObserver | null = null;
    let resizeTimer = 0;
    let lastRenderedWidth = 0;
    let renderGeneration = 0;

    const renderPdf = async () => {
      if (!pagesRef.current || !pdfAttachment?.downloadUrl) {
        setIsRendering(false);
        setRenderError('PDF preview topilmadi.');
        return;
      }

      const root = pagesRef.current;
      root.innerHTML = '';
      setIsRendering(true);
      setRenderError('');

      try {
        const response = await fetch(pdfAttachment.downloadUrl);
        if (!response.ok) throw new Error(`PDF yuklanmadi (${response.status}).`);
        const data = new Uint8Array(await response.arrayBuffer());
        loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;
        if (cancelled || !pagesRef.current) return;
        setPageCount(pdf.numPages);

        const drawAllPages = async (force = false) => {
          if (cancelled || !pagesRef.current) return;
          const host = pagesRef.current;
          const measuredWidth = host.clientWidth || host.parentElement?.clientWidth || 816;
          const availableWidth = Math.max(320, Math.min(measuredWidth, 900));

          // ResizeObserver can fire because the document height changes or because of browser
          // scrolling/reflow. Never repaint the PDF unless its actual width changed.
          if (!force && Math.abs(availableWidth - lastRenderedWidth) < 12) return;

          const generation = ++renderGeneration;
          const staging = document.createDocumentFragment();

          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            if (cancelled || generation !== renderGeneration) return;
            const page = await pdf.getPage(pageNumber);
            const baseViewport = page.getViewport({ scale: 1 });
            const cssScale = Math.min(1.65, availableWidth / baseViewport.width);
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const viewport = page.getViewport({ scale: cssScale * dpr });

            const canvas = document.createElement('canvas');
            canvas.className = 'infoedu-pdf-page';
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            canvas.style.width = `${Math.round(viewport.width / dpr)}px`;
            canvas.style.height = `${Math.round(viewport.height / dpr)}px`;
            canvas.setAttribute('aria-label', `${pageNumber}-sahifa`);

            const context = canvas.getContext('2d', { alpha: false });
            if (!context) throw new Error('Canvas renderer ishga tushmadi.');
            await page.render({ canvasContext: context, viewport, canvas }).promise;
            staging.appendChild(canvas);
          }

          if (cancelled || generation !== renderGeneration || !pagesRef.current) return;

          // Swap the fully rendered document in one operation. The old canvases stay visible
          // while a genuine resize is being redrawn, preventing white/blue flashing.
          pagesRef.current.replaceChildren(staging);
          lastRenderedWidth = availableWidth;
        };

        await drawAllPages(true);
        if (!cancelled) setIsRendering(false);

        const resizeTarget = root.parentElement || root;
        observer = new ResizeObserver((entries) => {
          const width = entries[0]?.contentRect.width || resizeTarget.clientWidth;
          if (Math.abs(width - lastRenderedWidth) < 12) return;
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(() => {
            void drawAllPages(false);
          }, 250);
        });
        observer.observe(resizeTarget);
      } catch (error) {
        if (cancelled) return;
        setIsRendering(false);
        setRenderError(error instanceof Error ? error.message : 'PDF preview ochilmadi.');
      }
    };

    void renderPdf();
    return () => {
      cancelled = true;
      renderGeneration += 1;
      observer?.disconnect();
      window.clearTimeout(resizeTimer);
      void loadingTask?.destroy();
    };
  }, [pdfAttachment?.downloadUrl, theoryData.id]);

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
            Word original ko‘rinishi
          </div>
          <h2 className="mt-1 text-sm sm:text-base font-bold text-slate-900 truncate">{theoryData.title}</h2>
          {pageCount > 0 && <p className="text-[10px] text-slate-400 mt-0.5">{pageCount} sahifa · uzluksiz ko‘rinish</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => toggleTheoryBookmark(theoryData.id)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
              theoryData.isBookmarked
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {theoryData.isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {theoryData.isBookmarked ? 'Saqlangan' : 'Xatcho‘p'}
          </button>

          <button
            onClick={() => setShowNotesModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4 text-blue-600" /> Qaydlarim
          </button>

          {docxAttachment?.downloadUrl && (
            <a
              href={docxAttachment.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-blue-600" /> DOCX
            </a>
          )}

          <button
            onClick={handleFinishLesson}
            disabled={isFinishing || isCompleted}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:cursor-default ${
              isCompleted ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isFinishing && !isCompleted ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {isCompleted ? 'Dars tugallandi' : 'Darsni tugatdim'}
          </button>
        </div>
      </div>

      <div className="pdf-document-shell rounded-2xl border border-slate-200 bg-[#e7ebf0] overflow-hidden shadow-sm">
        {isRendering && (
          <div className="min-h-[360px] flex items-center justify-center gap-3 text-sm font-semibold text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            Word original ko‘rinishi tayyorlanmoqda...
          </div>
        )}
        {renderError && !isRendering && (
          <div className="min-h-[360px] p-8 flex flex-col items-center justify-center text-center gap-3">
            <FileText className="w-10 h-10 text-slate-300" />
            <p className="font-bold text-slate-700">Preview ko‘rsatilmadi</p>
            <p className="text-xs text-slate-500 max-w-lg">{renderError}</p>
            {pdfAttachment?.downloadUrl && (
              <a href={pdfAttachment.downloadUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold">
                PDF previewni ochish
              </a>
            )}
          </div>
        )}
        <div ref={pagesRef} className={isRendering || renderError ? 'hidden' : 'infoedu-pdf-pages'} />
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <button
          onClick={onPrevLesson}
          disabled={!onPrevLesson || isFinishing}
          className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Oldingi dars
        </button>
        <button
          onClick={handleNext}
          disabled={!onNextLesson || isFinishing}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 flex items-center gap-2"
        >
          {isFinishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Keyingi dars <ChevronRight className="w-4 h-4" />
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
              <button onClick={() => setShowNotesModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Bekor qilish</button>
              <button onClick={handleSaveNotes} className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700">Saqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
