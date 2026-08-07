import React, { useState } from 'react';
import { useLMS } from '../context/LMSContext';
import { TestQuestionItem } from '../components/test/TestQuestionItem';
import { TestTimer } from '../components/test/TestTimer';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { EmptyState } from '../components/common/EmptyState';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';

export const TestTakingPage: React.FC = () => {
  const { tests, pageParams, submitTest, navigateTo, addToast } = useLMS();

  const testId = pageParams.testId || 'test-101';
  const test = tests[testId] || Object.values(tests)[0];

  const questions = test?.questions || [];
  const [currentIdx, setCurrentIdx] = useState(0);

  // User answers state: questionId -> answer
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  // Flagged questions set
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

  const [remainingTimeText, setRemainingTimeText] = useState('');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startedAt] = useState(() => Date.now());

  if (!test || questions.length === 0) {
    return (
      <EmptyState
        title="Test topilmadi"
        description="Ushbu test uchun savollar mavjud emas."
        actionLabel="Testlarga qaytish"
        onAction={() => navigateTo('tests')}
        icon={FileQuestion}
      />
    );
  }

  const currentQuestion = questions[currentIdx];

  const handleAnswerChange = (ans: any) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: ans,
    }));
  };

  const handleToggleFlag = () => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
  };

  const answeredCount = Object.keys(userAnswers).filter(
    (k) => userAnswers[k] !== undefined && userAnswers[k] !== ''
  ).length;

  const unansweredCount = questions.length - answeredCount;

  // Server-side evaluation: correct answers never need to be trusted from the browser.
  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const elapsed = Math.min(
        test.timeLimitMinutes * 60,
        Math.max(1, Math.round((Date.now() - startedAt) / 1000))
      );
      const result = await submitTest(test.id, userAnswers, Array.from(flaggedIds), elapsed);
      setShowFinishModal(false);
      navigateTo('test_result', { resultId: result.id });
    } catch (err) {
      addToast(
        'Test saqlanmadi',
        err instanceof Error ? err.message : 'Natijani serverga yuborishda xatolik yuz berdi.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Distraction-Free Header Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 sticky top-16 z-20">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
            {test.courseName}
          </span>
          <h2 className="text-base font-bold text-slate-800">{test.title}</h2>
        </div>

        <div className="flex items-center gap-3">
          <TestTimer
            initialMinutes={test.timeLimitMinutes}
            onTimeUp={handleFinalSubmit}
            onRemainingTimeChange={setRemainingTimeText}
          />

          <button
            onClick={() => setShowFinishModal(true)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Testni yakunlash</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Question Content & Navigation Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Cols: Question Item */}
        <div className="lg:col-span-3 space-y-4">
          <TestQuestionItem
            question={currentQuestion}
            questionNumber={currentIdx + 1}
            totalQuestions={questions.length}
            userAnswer={userAnswers[currentQuestion.id]}
            onAnswerChange={handleAnswerChange}
            isFlagged={flaggedIds.has(currentQuestion.id)}
            onToggleFlag={handleToggleFlag}
          />

          {/* Prev/Next Buttons */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <button
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Oldingi savol</span>
            </button>

            <span className="text-xs text-slate-500 font-semibold">
              {currentIdx + 1} / {questions.length}
            </span>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
              >
                <span>Keyingi savol</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowFinishModal(true)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5"
              >
                <span>Tekshirish va yakunlash</span>
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right 1 Col: Question Navigation Grid Matrix */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 h-fit">
          <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">
            Savollar xaritasi
          </h4>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const hasAnswered = userAnswers[q.id] !== undefined && userAnswers[q.id] !== '';
              const isFlagged = flaggedIds.has(q.id);
              const isCurrent = idx === currentIdx;

              let btnClass = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
              if (isCurrent) {
                btnClass = 'bg-blue-600 text-white ring-2 ring-blue-500/30 font-bold';
              } else if (isFlagged) {
                btnClass = 'bg-amber-100 text-amber-800 font-bold border border-amber-300';
              } else if (hasAnswered) {
                btnClass = 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-9 h-9 rounded-xl text-xs flex items-center justify-center transition-all ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300" />
              <span>Javob berilgan</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-slate-100" />
              <span>Javob berilmagan</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-300" />
              <span>Qayta ko‘rish uchun</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal before final submit */}
      <ConfirmationModal
        isOpen={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        onConfirm={handleFinalSubmit}
        title="Testni yakunlashni tasdiqlaysizmi?"
        message="Barcha belgilangan va belgilanmagan savollar saqlanadi hamda yakuniy natijangiz hisoblab chiqiladi."
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        flaggedCount={flaggedIds.size}
        remainingTimeFormatted={remainingTimeText}
      />
    </div>
  );
};
