import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Phone,
  School,
  User,
  Users,
} from 'lucide-react';
import { useLMS } from '../context/LMSContext';
import { api } from '../services/api';

interface RegisterPageProps {
  onBackToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onBackToLogin }) => {
  const { login } = useLMS();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    university: '',
    faculty: '',
    groupName: '',
    studentId: '',
    password: '',
    passwordConfirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password || !form.passwordConfirm) {
      setError('Ism, familiya, email va parol maydonlarini to‘ldiring.');
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError('Parollar bir xil emas.');
      return;
    }
    if (form.password.length < 8) {
      setError('Parol kamida 8 ta belgidan iborat bo‘lishi kerak.');
      return;
    }

    setLoading(true);
    try {
      await api.register({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        university: form.university.trim(),
        faculty: form.faculty.trim(),
        groupName: form.groupName.trim(),
        studentId: form.studentId.trim(),
      });
      await login(form.email.trim().toLowerCase(), form.password, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ro‘yxatdan o‘tishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all bg-white';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] border border-slate-200/20">
        <div className="p-6 sm:p-10 lg:p-12">
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Kirish sahifasiga qaytish
          </button>

          <div className="flex items-center gap-3 mb-7">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900 tracking-tight leading-none">
                Info<span className="text-blue-600">Edu</span>
              </h1>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Talaba ro‘yxatdan o‘tishi</span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Yangi hisob yarating</h2>
            <p className="text-xs text-slate-500 mt-1">Hisob avtomatik ravishda talaba sifatida yaratiladi. Kurslarni administrator biriktiradi.</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 mb-5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ism *" icon={<User className="w-4 h-4" />}>
                <input value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} placeholder="Anvar" className={inputClass} autoComplete="given-name" />
              </Field>
              <Field label="Familiya *" icon={<User className="w-4 h-4" />}>
                <input value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} placeholder="Axadjonov" className={inputClass} autoComplete="family-name" />
              </Field>
              <Field label="Email *" icon={<Mail className="w-4 h-4" />}>
                <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="student@example.com" className={inputClass} autoComplete="email" />
              </Field>
              <Field label="Telefon" icon={<Phone className="w-4 h-4" />}>
                <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+998 90 123 45 67" className={inputClass} autoComplete="tel" />
              </Field>
              <Field label="Universitet / o‘quv markazi" icon={<School className="w-4 h-4" />}>
                <input value={form.university} onChange={(e) => updateField('university', e.target.value)} placeholder="PDP University" className={inputClass} />
              </Field>
              <Field label="Fakultet / yo‘nalish" icon={<GraduationCap className="w-4 h-4" />}>
                <input value={form.faculty} onChange={(e) => updateField('faculty', e.target.value)} placeholder="Software Engineering" className={inputClass} />
              </Field>
              <Field label="Guruh" icon={<Users className="w-4 h-4" />}>
                <input value={form.groupName} onChange={(e) => updateField('groupName', e.target.value)} placeholder="SE-301" className={inputClass} />
              </Field>
              <Field label="Student ID" icon={<User className="w-4 h-4" />}>
                <input value={form.studentId} onChange={(e) => updateField('studentId', e.target.value)} placeholder="SE-301-0001" className={inputClass} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Parol *" icon={<Lock className="w-4 h-4" />}>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="Kamida 8 ta belgi"
                    className={`${inputClass} pr-10`}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Parolni takrorlang *" icon={<Lock className="w-4 h-4" />}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.passwordConfirm}
                  onChange={(e) => updateField('passwordConfirm', e.target.value)}
                  placeholder="Parolni qayta kiriting"
                  className={inputClass}
                  autoComplete="new-password"
                />
              </Field>
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-[11px] leading-relaxed text-blue-800">
              Ro‘yxatdan o‘tganingizdan keyin hisobingiz darhol ochiladi. Kurslar ko‘rinishi uchun administrator sizni kerakli kursga biriktiradi.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-w-52 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Hisob yaratish
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <aside className="hidden lg:flex bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-10 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10">
            <span className="inline-flex px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-wider text-blue-100">InfoEdu Student</span>
            <h3 className="text-2xl font-bold mt-5 leading-snug">Bitta hisob bilan barcha o‘quv materiallaringizga kiring.</h3>
            <p className="text-xs text-blue-100 mt-4 leading-relaxed">Nazariya, prezentatsiya, video, test natijalari va progress bir profilda saqlanadi.</p>
          </div>
          <div className="relative z-10 space-y-3 text-xs">
            {['Xavfsiz shaxsiy hisob', 'Kurs progressi doimiy saqlanadi', 'Test natijalari va statistika'].map((item) => (
              <div key={item} className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/10">
                <span className="w-6 h-6 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-bold">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <label className="block">
    <span className="text-xs font-semibold text-slate-700 block mb-1.5">{label}</span>
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</span>
      {children}
    </div>
  </label>
);
