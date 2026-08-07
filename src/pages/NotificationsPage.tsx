import React from 'react';
import { useLMS } from '../context/LMSContext';
import { Bell, Check, Trash2, Calendar, FileQuestion, BookOpen } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationRead, addToast } = useLMS();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bildirishnomalar</h1>
          <p className="text-xs text-slate-500 mt-1">Darslar, yangi testlar va e’lonlar bo‘yicha xabarlar</p>
        </div>
        <button
          onClick={() => addToast('Barchasi o‘qildi', 'Barcha xabarlar o‘qilgan deb belgilandi.', 'info')}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
        >
          <Check className="w-4 h-4" />
          <span>Barchasini o‘qilgan deb belgilash</span>
        </button>
      </div>

      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Bildirishnomalar yo‘q.</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markNotificationRead(n.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                !n.isRead ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100 opacity-80'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`p-2 rounded-xl text-white shrink-0 mt-0.5 ${
                    n.type === 'test'
                      ? 'bg-amber-500'
                      : n.type === 'course'
                      ? 'bg-blue-600'
                      : 'bg-indigo-600'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-800">{n.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 font-medium block">{n.date}</span>
                </div>
              </div>

              {!n.isRead && (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-2" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
