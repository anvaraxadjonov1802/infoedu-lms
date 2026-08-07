import React, { useState } from 'react';
import { useLMS } from '../context/LMSContext';
import { Save } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, courses, updateUserProfile, addToast } = useLMS();

  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({ fullName, phone });
    } catch (err) {
      addToast('Saqlash xatosi', err instanceof Error ? err.message : 'Profilni saqlab bo‘lmadi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Banner */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="w-24 h-24 rounded-full object-cover border-4 border-blue-100 shadow-md"
            />
          </div>

          <div className="text-center sm:text-left space-y-1">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
              {user.role === 'student' ? 'Talaba' : user.role}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{user.fullName}</h1>
            <p className="text-xs text-slate-500">
              {user.faculty} • Guruh: <span className="font-bold text-slate-800">{user.group}</span> • Student ID:{' '}
              <span className="font-bold text-slate-800">{user.studentId}</span>
            </p>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-center">
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Jami Kurslar</p>
            <p className="text-lg font-extrabold text-slate-800 mt-0.5">{courses.length} ta</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900">
            <p className="text-[10px] font-bold uppercase">Tugallangan Darslar</p>
            <p className="text-lg font-extrabold mt-0.5">{user.completedLessonsCount} ta</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-purple-900">
            <p className="text-[10px] font-bold uppercase">O‘rtacha Ball</p>
            <p className="text-lg font-extrabold mt-0.5">{user.averageScore}%</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-900">
            <p className="text-[10px] font-bold uppercase">Ketma-ketlik</p>
            <p className="text-lg font-extrabold mt-0.5">{user.studyStreakDays} kun</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-800 border-b border-slate-100 pb-3">
          Shaxsiy Ma’lumotlarni Tahrirlash
        </h3>

        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Ism Sharifi</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-100 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Telefon Raqam</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Guruh (O‘zgarmaydi)</label>
            <input
              type="text"
              disabled
              value={user.group}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-100 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="sm:col-span-2 pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
