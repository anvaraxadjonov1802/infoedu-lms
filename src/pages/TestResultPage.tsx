import React from 'react';
import { useLMS } from '../context/LMSContext';
import { CircularProgress } from '../components/common/CircularProgress';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { EmptyState } from '../components/common/EmptyState';
import {
  CheckCircle2,
  XCircle,
  Award,
  RotateCcw,
  BookOpen,
  Clock,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export const TestResultPage: React.FC = () => {
  const { testResults, pageParams, navigateTo } = useLMS();

  const resultId = pageParams.resultId || testResults[0]?.id;
  const result = testResults.find((r) => r.id === resultId) || testResults[0];

  if (!result) {
    return (
      <EmptyState
        title="Natija topilmadi"
        description="So‘ralgan test natijasi tizimda mavjud emas."
        actionLabel="Testlarga qaytish"
        onAction={() => navigateTo('tests')}
        icon={Award}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Natijalarim', page: 'results' },
          { label: result.testTitle },
        ]}
      />

      {/* Main Result Card Header */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{result.courseName}</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{result.testTitle}</h1>

            <p
              className={`text-sm font-semibold ${
                result.isPassed ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {result.isPassed
                ? '🎉 Tabriklaymiz, testdan muvaffaqiyatli o‘tdingiz!'
                : '⚠️ Natijangizni yaxshilash uchun mavzularni qayta ko‘rib chiqing.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">To‘plangan Ball</p>
                <p className="text-base font-bold text-slate-800 mt-0.5">
                  {result.score} / {result.maxScore}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                <p className="text-[10px] text-emerald-700 font-semibold uppercase">To‘g‘ri</p>
                <p className="text-base font-bold text-emerald-800 mt-0.5">
                  {result.correctAnswersCount} ta
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-center">
                <p className="text-[10px] text-rose-700 font-semibold uppercase">Noto‘g‘ri</p>
                <p className="text-base font-bold text-rose-800 mt-0.5">
                  {result.incorrectAnswersCount} ta
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Urinish #</p>
                <p className="text-base font-bold text-slate-800 mt-0.5">{result.attemptNumber}-urinish</p>
              </div>
            </div>
          </div>

          {/* Circular Score Gauge */}
          <div className="shrink-0 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <CircularProgress
              progress={result.percentage}
              size={140}
              strokeWidth={12}
              label="Natija"
              color={result.isPassed ? '#10b981' : '#f59e0b'}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={() => navigateTo('test_taking', { testId: result.testId })}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Qayta topshirish</span>
          </button>
          <button
            onClick={() => navigateTo('courses')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" />
            <span>Kursga qaytish</span>
          </button>
        </div>
      </div>

      {/* Answer Reviews Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-800 border-b border-slate-100 pb-3">
          Savollar Tahlili va Izohlar
        </h3>

        <div className="space-y-4 divide-y divide-slate-100">
          {result.answerReviews?.map((rev, idx) => (
            <div key={idx} className="pt-4 first:pt-0 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-xs font-bold text-slate-800">
                  {idx + 1}. {rev.questionText}
                </h4>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    rev.isCorrect
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {rev.isCorrect ? 'To‘g‘ri' : 'Noto‘g‘ri'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div
                  className={`p-2.5 rounded-xl border ${
                    rev.isCorrect
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/50 border-rose-200 text-rose-900'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase block opacity-70">
                    Sizning javobingiz:
                  </span>
                  <span className="font-semibold">{rev.userAnswerText}</span>
                </div>

                {!rev.isCorrect && (
                  <div className="p-2.5 rounded-xl border bg-emerald-50/50 border-emerald-200 text-emerald-900">
                    <span className="text-[10px] font-bold uppercase block opacity-70">
                      To‘g‘ri javob:
                    </span>
                    <span className="font-semibold">{rev.correctAnswerText}</span>
                  </div>
                )}
              </div>

              {rev.explanation && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-700 block mb-0.5">Izoh:</span>
                  {rev.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
