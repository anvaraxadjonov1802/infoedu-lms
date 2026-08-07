import React from 'react';
import { useLMS } from '../context/LMSContext';
import { Award, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { testResults, navigateTo } = useLMS();

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Barcha Test Natijalari va Ballar</h1>
          <p className="text-xs text-slate-500 mt-1">O‘quv semestri davomida topshirilgan barcha sinov imtihonlari tarixi</p>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                <th className="py-2.5 px-3">Test Nomi</th>
                <th className="py-2.5 px-3">Fan kodi & nomi</th>
                <th className="py-2.5 px-3 text-center">Topshirilgan Sana</th>
                <th className="py-2.5 px-3 text-center">Ball / Maks</th>
                <th className="py-2.5 px-3 text-center">Foiz %</th>
                <th className="py-2.5 px-3 text-center">Holat</th>
                <th className="py-2.5 px-3 text-right">Batafsil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {testResults.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-semibold text-slate-800">{r.testTitle}</td>
                  <td className="py-3 px-3 text-slate-500">{r.courseName}</td>
                  <td className="py-3 px-3 text-center text-slate-500">{r.date}</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800">
                    {r.score} / {r.maxScore}
                  </td>
                  <td className="py-3 px-3 text-center font-extrabold text-blue-600">{r.percentage}%</td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        r.isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {r.isPassed ? 'O‘tdi' : 'O‘tmadi'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => navigateTo('test_result', { resultId: r.id })}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-blue-600 transition-colors inline-flex items-center gap-1 font-semibold"
                    >
                      <span>Tahlil</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
