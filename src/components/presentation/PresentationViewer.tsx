import React, { useState } from 'react';
import { PresentationData } from '../../types/lms';
import { useLMS } from '../../context/LMSContext';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Download,
  CheckCircle,
  Presentation,
} from 'lucide-react';

interface PresentationViewerProps {
  presentation: PresentationData;
  onNextLesson?: () => void;
  onPrevLesson?: () => void;
}

export const PresentationViewer: React.FC<PresentationViewerProps> = ({
  presentation,
  onNextLesson,
  onPrevLesson,
}) => {
  const { markLessonCompleted, addToast } = useLMS();

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<'slides' | 'file'>('slides');
  const sourceFileUrl = presentation.downloadUrl || '';
  const fileUrl = presentation.embedUrl || (
    presentation.fileType === 'pptx' && /^https?:\/\//.test(sourceFileUrl)
      ? `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(sourceFileUrl)}`
      : sourceFileUrl
  );
  const canEmbedFile = ['pdf', 'pptx'].includes(presentation.fileType) && /^https?:\/\//.test(fileUrl || '');

  const slides = presentation.slides || [];
  const currentSlide = slides[currentSlideIndex] || {
    slideNumber: 1,
    title: presentation.title,
    bulletPoints: ['Taqdimot slaydlari yuklanmoqda...'],
  };

  const handleNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  const handleMarkCompleted = async () => {
    setIsCompleted(true);
    try {
      await markLessonCompleted(presentation.courseId, presentation.lessonId);
    } catch {
      setIsCompleted(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      className={`space-y-4 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-900 p-6 flex flex-col justify-between overflow-y-auto'
          : ''
      }`}
    >
      {/* Top Controls Bar */}
      <div
        className={`p-4 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-4 ${
          isFullscreen
            ? 'bg-slate-800 border-slate-700 text-white'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm truncate max-w-xs">{presentation.title}</h3>
            <p className="text-xs text-slate-400">
              Slayd {currentSlideIndex + 1} / {slides.length}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {canEmbedFile && (
            <div className="flex items-center rounded-xl bg-slate-100 p-1 text-[11px] font-bold text-slate-600">
              <button onClick={() => setViewMode('slides')} className={`px-2.5 py-1 rounded-lg ${viewMode === 'slides' ? 'bg-white text-blue-700 shadow-xs' : ''}`}>Slayd</button>
              <button onClick={() => setViewMode('file')} className={`px-2.5 py-1 rounded-lg ${viewMode === 'file' ? 'bg-white text-blue-700 shadow-xs' : ''}`}>{presentation.fileType.toUpperCase()}</button>
            </div>
          )}
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 text-slate-700">
            <button
              onClick={() => setZoomLevel((z) => Math.max(80, z - 10))}
              className="p-1 hover:bg-white rounded-lg transition-colors"
              title="Kichraytirish"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-1">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              className="p-1 hover:bg-white rounded-lg transition-colors"
              title="Kattalashtirish"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl border transition-colors ${
              isFullscreen
                ? 'border-slate-700 text-white hover:bg-slate-800'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title={isFullscreen ? 'Chiqish' : 'To‘liq ekran'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Download button */}
          <a
            href={presentation.downloadUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (!presentation.downloadUrl || presentation.downloadUrl === '#') {
                e.preventDefault();
                addToast('Fayl mavjud emas', 'Yuklab olinadigan fayl biriktirilmagan.', 'warning');
              }
            }}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Slaydni yuklab olish"
          >
            <Download className="w-4 h-4" />
          </a>

          {/* Mark completed */}
          <button
            onClick={handleMarkCompleted}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isCompleted
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isCompleted ? 'Tugallandi' : 'Taqdimotni tugatdim'}</span>
          </button>
        </div>
      </div>

      {/* Main Presentation Stage */}
      {viewMode === 'file' && canEmbedFile ? (
        <div className={`rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl ${isFullscreen ? 'flex-1 min-h-[70vh]' : 'h-[70vh] min-h-[520px]'}`}>
          <iframe
            src={presentation.fileType === 'pdf' ? `${fileUrl}#toolbar=1&navpanes=0&view=FitH` : fileUrl}
            title={presentation.title}
            className="w-full h-full border-0 bg-white"
          />
        </div>
      ) : (
        <div
          className={`rounded-2xl border shadow-lg overflow-hidden flex flex-col justify-between transition-all ${
            isFullscreen
              ? 'flex-1 bg-slate-950 border-slate-800 text-white my-4 p-8'
              : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-slate-800 text-white p-8 min-h-[420px]'
          }`}
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">{presentation.courseName}</span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">{currentSlide.title}</h2>
              {currentSlide.subtitle && <p className="text-xs text-slate-400 mt-1">{currentSlide.subtitle}</p>}
            </div>
            <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold">Slayd #{currentSlide.slideNumber}</span>
          </div>

          <div className="my-8 space-y-4">
            <ul className="space-y-3">
              {currentSlide.bulletPoints?.map((point, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
            {currentSlide.codeOrFormula && (
              <div className="mt-6 p-4 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-blue-300">
                <span className="text-[10px] text-slate-500 block mb-1">Formula / Kod:</span>
                <code>{currentSlide.codeOrFormula}</code>
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>InfoEdu LMS Slide Viewer</span><span>{presentation.moduleName}</span>
          </div>
        </div>
      )}

      {/* Navigation Thumbnails & Slide Prev/Next Controls */}
      {viewMode === 'slides' && (
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <button
          onClick={handlePrevSlide}
          disabled={currentSlideIndex === 0}
          className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Oldingi slayd</span>
        </button>

        {/* Slide Indicator Dots */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs scrollbar-none">
          {slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                idx === currentSlideIndex
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <button
          onClick={handleNextSlide}
          disabled={currentSlideIndex === slides.length - 1}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-40 flex items-center gap-1.5"
        >
          <span>Keyingi slayd</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      )}

      <div className="pt-2 flex items-center justify-between gap-3">
        <button
          onClick={onPrevLesson}
          disabled={!onPrevLesson}
          className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Oldingi dars
        </button>
        <button
          onClick={onNextLesson}
          disabled={!onNextLesson}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 flex items-center gap-2"
        >
          Keyingi dars <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
