import React from 'react';
import { useLMS } from '../../context/LMSContext';
import { Award, ArrowUpRight, CheckCircle2, XCircle } from 'lucide-react';

export const RecentResultsTable: React.FC = () => {
  const { testResults, navigateTo } = useLMS();

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            So‘nggi Test Natijalari
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Yaqin orada topshirilgan sinovlar</p>
        </div>

        <button
          onClick={() => navigateTo('results')}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <span>Barchasini ko‘rish</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
              <th className="py-2.5 px-3">Test Nomi</th>
              <th className="py-2.5 px-3">Kurs</th>
              <th className="py-2.5 px-3 text-center">Ball</th>
              <th className="py-2.5 px-3 text-center">Foiz</th>
              <th className="py-2.5 px-3">Sana</th>
              <th className="py-2.5 px-3 text-right">Holat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {testResults.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  Hali test natijalari mavjud emas.
                </td>
              </tr>
            ) : (
              testResults.slice(0, 5).map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigateTo('test_result', { resultId: r.id })}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3 font-semibold text-slate-800">{r.testTitle}</td>
                  <td className="py-3 px-3 text-slate-500 max-w-[150px] truncate">{r.courseName}</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-700">
                    {r.score}/{r.maxScore}
                  </td>
                  <td className="py-3 px-3 text-center font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        r.isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {r.percentage}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-[11px]">{r.date}</td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                        r.isPassed ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {r.isPassed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> O‘tdi
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> Qayta
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
