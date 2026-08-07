import React from 'react';
import { Test } from '../../types/lms';
import { useLMS } from '../../context/LMSContext';
import { FileQuestion, Clock, RotateCcw, Award, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface TestCardProps {
  test: Test;
}

export const TestCard: React.FC<TestCardProps> = ({ test }) => {
  const { navigateTo } = useLMS();

  const getStatusBadge = (status: Test['status']) => {
    switch (status) {
      case 'passed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Muvaffaqiyatli</span>;
      case 'retake_needed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">Qayta topshirish kerak</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Davom etmoqda</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Boshlanmagan</span>;
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          {getStatusBadge(test.status)}
          <span className="text-[11px] font-medium text-slate-400 truncate">{test.courseName}</span>
        </div>

        <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
          {test.title}
        </h3>
        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{test.moduleName}</p>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-xl bg-slate-50 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <FileQuestion className="w-4 h-4 text-slate-400" />
            <span>{test.questionCount} ta savol</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{test.timeLimitMinutes} daqiqa</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>{test.attemptsUsed}/{test.attemptsAllowed} urinish</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-slate-400" />
            <span>O‘tish bali: {test.passingScorePercent}%</span>
          </div>
        </div>

        {test.bestScorePercent > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs px-1">
            <span className="text-slate-500">Eng yuqori natija:</span>
            <span className="font-bold text-emerald-600">{test.bestScorePercent}%</span>
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100">
        <button
          onClick={() => navigateTo('test_taking', { testId: test.id })}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5"
        >
          <span>{test.status === 'passed' ? 'Qayta topshirish' : 'Testni boshlash'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
