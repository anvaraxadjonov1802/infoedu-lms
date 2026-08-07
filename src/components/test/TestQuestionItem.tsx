import React from 'react';
import { Question } from '../../types/lms';
import { Flag, Check, Code } from 'lucide-react';

interface TestQuestionItemProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  userAnswer: any;
  onAnswerChange: (ans: any) => void;
  isFlagged: boolean;
  onToggleFlag: () => void;
}

export const TestQuestionItem: React.FC<TestQuestionItemProps> = ({
  question,
  questionNumber,
  totalQuestions,
  userAnswer,
  onAnswerChange,
  isFlagged,
  onToggleFlag,
}) => {
  const handleSingleChoice = (optId: string) => {
    onAnswerChange(optId);
  };

  const handleMultipleChoice = (optId: string) => {
    const currentList: string[] = Array.isArray(userAnswer) ? userAnswer : [];
    if (currentList.includes(optId)) {
      onAnswerChange(currentList.filter((id) => id !== optId));
    } else {
      onAnswerChange([...currentList, optId]);
    }
  };

  const handleTrueFalse = (val: boolean) => {
    onAnswerChange(val);
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
      {/* Header Info & Flag Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
            Savol {questionNumber} / {totalQuestions}
          </span>
          <span className="text-xs text-slate-400 font-medium">{question.points} ball</span>
        </div>

        <button
          onClick={onToggleFlag}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
            isFlagged
              ? 'bg-amber-100 border-amber-300 text-amber-800'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'text-amber-600 fill-amber-600' : ''}`} />
          <span>{isFlagged ? 'Belgilangan' : 'Keyin ko‘rib chiqish'}</span>
        </button>
      </div>

      {/* Question Text */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 leading-relaxed">
          {question.questionText}
        </h3>

        {question.codeSnippet && (
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
            <pre>{question.codeSnippet}</pre>
          </div>
        )}
      </div>

      {/* Answer Options according to type */}
      <div className="space-y-2.5 pt-2">
        {question.type === 'single_choice' &&
          question.options?.map((opt) => {
            const isSelected = userAnswer === opt.id;

            return (
              <label
                key={opt.id}
                onClick={() => handleSingleChoice(opt.id)}
                className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span className="text-xs leading-relaxed">{opt.text}</span>
              </label>
            );
          })}

        {question.type === 'multiple_choice' &&
          question.options?.map((opt) => {
            const isSelected = Array.isArray(userAnswer) && userAnswer.includes(opt.id);

            return (
              <label
                key={opt.id}
                onClick={() => handleMultipleChoice(opt.id)}
                className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span className="text-xs leading-relaxed">{opt.text}</span>
              </label>
            );
          })}

        {question.type === 'true_false' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTrueFalse(true)}
              className={`p-4 rounded-xl border text-xs font-bold transition-all ${
                userAnswer === true
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Rost (True)
            </button>
            <button
              type="button"
              onClick={() => handleTrueFalse(false)}
              className={`p-4 rounded-xl border text-xs font-bold transition-all ${
                userAnswer === false
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Yolg‘on (False)
            </button>
          </div>
        )}

        {question.type === 'short_text' && (
          <div>
            <textarea
              rows={3}
              value={userAnswer || ''}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="Qisqa va aniq javobingizni yozing..."
              className="w-full p-3.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
