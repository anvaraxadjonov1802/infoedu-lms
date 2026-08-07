import React, { useState } from 'react';
import { useLMS } from '../context/LMSContext';
import { api } from '../services/api';
import { Bell, Check, Globe, Lock, Moon, Sun } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { addToast, language, setLanguage, theme, toggleTheme } = useLMS();
  const [emailNotifs, setEmailNotifs] = useState(() => localStorage.getItem('infoedu_email_notifs') !== 'false');
  const [browserNotifs, setBrowserNotifs] = useState(() => localStorage.getItem('infoedu_browser_notifs') !== 'false');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveSettings = async () => {
    localStorage.setItem('infoedu_email_notifs', String(emailNotifs));
    localStorage.setItem('infoedu_browser_notifs', String(browserNotifs));
    if (browserNotifs && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // Browser notification permission is optional; in-app notifications still work.
      }
    }
    addToast('Sozlamalar saqlandi', 'Interfeys va bildirishnoma sozlamalari yangilandi.', 'success');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      addToast('Parol juda qisqa', 'Yangi parol kamida 8 ta belgidan iborat bo‘lsin.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Parollar mos emas', 'Yangi parol va tasdiq bir xil bo‘lishi kerak.', 'warning');
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('Parol o‘zgartirildi', 'Yangi parol muvaffaqiyatli saqlandi.', 'success');
    } catch (err) {
      addToast('Parol o‘zgarmadi', err instanceof Error ? err.message : 'Xatolik yuz berdi.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const languageOptions = [
    { id: 'uz' as const, label: 'O‘zbekcha' },
    { id: 'ru' as const, label: 'Русский' },
    { id: 'en' as const, label: 'English' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">Tizim sozlamalari</h1>
        <p className="text-xs text-slate-500 mt-1">Interfeys, bildirishnomalar va hisob xavfsizligi</p>
      </div>

      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" /> Interfeys tili
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {languageOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setLanguage(option.id)}
                className={`p-3.5 rounded-xl border text-xs font-bold text-left flex items-center justify-between ${
                  language === option.id ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <span>{option.label}</span>
                {language === option.id && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
          </div>
          {language !== 'uz' && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Til tanlovi saqlanadi. Hozirgi kontentning asosiy tili O‘zbekcha; keyingi kontentlar tanlangan tilga mos qo‘shilishi mumkin.
            </p>
          )}
        </div>

        <div className="space-y-3 pb-6 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            {theme === 'light' ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-amber-500" />}
            Ko‘rinish
          </h3>
          <button
            type="button"
            onClick={toggleTheme}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {theme === 'light' ? 'Qorong‘u rejimga o‘tish' : 'Yorug‘ rejimga o‘tish'}
          </button>
        </div>

        <div className="space-y-3 pb-6 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" /> Bildirishnomalar
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs cursor-pointer">
              <span className="font-semibold text-slate-700">Email xabarnomalari</span>
              <input type="checkbox" checked={emailNotifs} onChange={(e) => setEmailNotifs(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs cursor-pointer">
              <span className="font-semibold text-slate-700">Brauzer bildirishnomalari</span>
              <input type="checkbox" checked={browserNotifs} onChange={(e) => setBrowserNotifs(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
            </label>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={handleSaveSettings} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20">
              Sozlamalarni saqlash
            </button>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-600" /> Parolni o‘zgartirish
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Joriy parol" className="p-2.5 rounded-xl border border-slate-200 text-xs" required />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Yangi parol" className="p-2.5 rounded-xl border border-slate-200 text-xs" required />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Yangi parolni tasdiqlang" className="p-2.5 rounded-xl border border-slate-200 text-xs" required />
          </div>
          <div className="flex justify-end">
            <button disabled={savingPassword} className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs disabled:opacity-50">
              {savingPassword ? 'Saqlanmoqda...' : 'Parolni yangilash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
