import React, { useState } from 'react';
import { useLMS } from '../context/LMSContext';
import { UserRole } from '../types/lms';
import { GraduationCap, Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, UserPlus } from 'lucide-react';

interface LoginPageProps {
  onRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onRegister }) => {
  const { login, demoLogin } = useLMS();
  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const [email, setEmail] = useState(demoMode ? 'anvar.axadjonov@tuit.uz' : '');
  const [password, setPassword] = useState(demoMode ? 'InfoEdu2026!' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Iltimos, barcha maydonlarni to‘ldiring.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password, rememberMe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email yoki parol noto‘g‘ri.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    setError(null);
    setLoading(true);
    try {
      await demoLogin(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo hisobga kirib bo‘lmadi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-slate-200/20">
        <div className="p-8 sm:p-12 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-slate-900 tracking-tight leading-none">Info<span className="text-blue-600">Edu</span></h1>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">LMS Ta’lim Platformasi</span>
              </div>
            </div>

            <div className="space-y-1 mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Hisobingizga kiring</h2>
              <p className="text-xs text-slate-500">Zamonaviy elektron ta’lim platformasi</p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Elektron pochta (Email)</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Parol</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 gap-3">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                  <span>Meni eslab qolish</span>
                </label>
                <button type="button" onClick={() => setError('Parolni tiklash uchun platforma administratoriga murojaat qiling.')} className="text-blue-600 hover:underline font-medium">
                  Parolni unutdingizmi?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Kirish</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs text-slate-500 text-center mb-3">Hali hisobingiz yo‘qmi?</p>
              <button
                type="button"
                onClick={onRegister}
                className="w-full py-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Ro‘yxatdan o‘tish
              </button>
            </div>
          </div>

          {demoMode && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Tezkor Demo Kirish:</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => handleDemoLogin('student')} className="py-2 px-1 rounded-xl bg-slate-100 hover:bg-blue-50 text-blue-700 text-[11px] font-bold transition-colors">Talaba</button>
                <button onClick={() => handleDemoLogin('teacher')} className="py-2 px-1 rounded-xl bg-slate-100 hover:bg-purple-50 text-purple-700 text-[11px] font-bold transition-colors">O‘qituvchi</button>
                <button onClick={() => handleDemoLogin('admin')} className="py-2 px-1 rounded-xl bg-slate-100 hover:bg-rose-50 text-rose-700 text-[11px] font-bold transition-colors">Admin</button>
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:flex bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-12 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-blue-200">InfoEdu LMS</span>
            <h3 className="text-2xl font-bold tracking-tight leading-snug">Nazariya, taqdimot, video va testlar bir joyda.</h3>
            <p className="text-xs text-blue-100 leading-relaxed opacity-90">Talabalar uchun o‘quv materiallari, progress, test natijalari va bildirishnomalarni yagona platformada boshqaring.</p>
          </div>
          <div className="relative z-10 p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
            <p className="text-xs font-bold text-white">Yangi foydalanuvchimisiz?</p>
            <p className="text-[10px] text-blue-200 mt-1">Ro‘yxatdan o‘ting va administrator kurslarni profilingizga biriktiradi.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
