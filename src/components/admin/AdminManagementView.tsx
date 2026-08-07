import React, { useEffect, useMemo, useState } from 'react';
import { useLMS } from '../../context/LMSContext';
import { api, AdminStatsResponse } from '../../services/api';
import { Plus, Search } from 'lucide-react';

const emptyStats: AdminStatsResponse = {
  totalStudents: 0,
  activeStudents: 0,
  totalCourses: 0,
  submittedTests: 0,
  averageScore: 0,
  students: [],
  announcements: [],
};

export const AdminManagementView: React.FC = () => {
  const { user, addToast } = useLMS();
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'announcements'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [stats, setStats] = useState<AdminStatsResponse>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      setStats(await api.adminStats());
    } catch (err) {
      addToast('Admin ma’lumotlari yuklanmadi', err instanceof Error ? err.message : 'Server xatosi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stats.students;
    return stats.students.filter((student) =>
      [student.fullName, student.studentId, student.group, student.faculty].some((value) => value.toLowerCase().includes(q))
    );
  }, [searchQuery, stats.students]);

  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) return;
    setSending(true);
    try {
      const result = await api.createAnnouncement(announcementTitle.trim(), announcementContent.trim());
      addToast('E’lon chop etildi!', `${result.sent} ta talabaga yuborildi.`, 'success');
      setShowAnnouncementModal(false);
      setAnnouncementTitle('');
      setAnnouncementContent('');
      await loadStats();
    } catch (err) {
      addToast('E’lon yuborilmadi', err instanceof Error ? err.message : 'Server xatosi.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (user.role === 'student') {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 text-sm text-slate-600">
        Ushbu bo‘lim faqat administrator va o‘qituvchilar uchun.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-900 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-wider text-purple-300">
            {user.role === 'admin' ? 'Administrator rejimi' : 'O‘qituvchi rejimi'}
          </span>
          <h2 className="text-2xl font-bold tracking-tight mt-2">InfoEdu boshqaruv markazi</h2>
          <p className="text-xs text-slate-300 mt-1">Real server statistikasi, talabalar va e’lonlarni boshqarish.</p>
        </div>
        <button onClick={() => setShowAnnouncementModal(true)} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-lg shadow-blue-500/30 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yangi e’lon
        </button>
      </div>

      <div className="flex border-b border-slate-200 text-xs font-semibold space-x-6 overflow-x-auto">
        {([
          ['overview', 'Umumiy statistika'],
          ['students', 'Talabalar'],
          ['announcements', 'E’lonlar'],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} className={`pb-3 border-b-2 whitespace-nowrap ${activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 rounded-2xl bg-white border border-slate-200 text-sm text-slate-500">Ma’lumotlar yuklanmoqda...</div>
      ) : activeTab === 'overview' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            ['Jami talabalar', stats.totalStudents],
            ['Faol talabalar', stats.activeStudents],
            ['Mavjud kurslar', stats.totalCourses],
            ['Topshirilgan testlar', stats.submittedTests],
            ['O‘rtacha natija', `${stats.averageScore}%`],
          ].map(([label, value]) => (
            <div key={label} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <p className="text-[11px] font-semibold text-slate-400 uppercase">{label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
            </div>
          ))}
        </div>
      ) : activeTab === 'students' ? (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-base text-slate-800">Talabalar ro‘yxati</h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Ism, ID, guruh..." className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                <th className="py-2.5 px-3">Ism sharifi</th><th className="py-2.5 px-3">Student ID</th><th className="py-2.5 px-3">Guruh</th><th className="py-2.5 px-3">Fakultet</th><th className="py-2.5 px-3 text-center">Kurslar</th><th className="py-2.5 px-3 text-center">O‘rtacha</th><th className="py-2.5 px-3 text-right">Holat</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-800">{student.fullName}</td>
                    <td className="py-3 px-3 text-slate-500 font-mono">{student.studentId}</td>
                    <td className="py-3 px-3">{student.group}</td>
                    <td className="py-3 px-3 text-slate-500">{student.faculty}</td>
                    <td className="py-3 px-3 text-center font-bold">{student.activeCourses}</td>
                    <td className="py-3 px-3 text-center font-bold text-blue-600">{student.averageScore}%</td>
                    <td className="py-3 px-3 text-right"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{student.status === 'active' ? 'Faol' : 'Nofaol'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {stats.announcements.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500">Hali e’lon yuborilmagan.</div>
          ) : stats.announcements.map((announcement) => (
            <div key={announcement.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="text-xs text-slate-400">{announcement.date} • {announcement.time}</div>
              <h4 className="font-bold text-base text-slate-800">{announcement.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{announcement.message}</p>
            </div>
          ))}
        </div>
      )}

      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-800">Yangi e’lon</h3>
            <input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} placeholder="E’lon sarlavhasi" className="w-full p-2.5 rounded-xl border border-slate-200 text-xs" />
            <textarea rows={5} value={announcementContent} onChange={(e) => setAnnouncementContent(e.target.value)} placeholder="E’lon mazmuni..." className="w-full p-2.5 rounded-xl border border-slate-200 text-xs" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAnnouncementModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Bekor qilish</button>
              <button disabled={sending} onClick={handleCreateAnnouncement} className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{sending ? 'Yuborilmoqda...' : 'Chop etish'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
