import React, { useState, useRef, useEffect } from 'react';
import { useLMS, PageView } from '../../context/LMSContext';
import { Test } from '../../types/lms';
import { MediaImage } from './MediaImage';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  User,
  Settings,
  LogOut,
  ChevronDown,
  BookOpen,
  FileText,
  FileQuestion,
  ShieldAlert,
  CheckCheck,
} from 'lucide-react';

interface HeaderProps {
  setMobileOpen: (v: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setMobileOpen }) => {
  const {
    activePage,
    navigateTo,
    user,
    logout,
    switchRole,
    theme,
    toggleTheme,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    globalSearchQuery,
    setGlobalSearchQuery,
    courses,
    tests,
  } = useLMS();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadNotifs = notifications.filter((n) => !n.isRead);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = (page: PageView): string => {
    switch (page) {
      case 'dashboard': return 'Bosh sahifa';
      case 'courses': return 'Mening kurslarim';
      case 'course_detail': return 'Kurs haqida ma’lumot';
      case 'theory': return 'Nazariy darslar';
      case 'presentations': return 'Taqdimotlar';
      case 'videos': return 'Video darslar';
      case 'tests': return 'Testlar katalogi';
      case 'test_taking': return 'Test topshirish';
      case 'test_result': return 'Test natijasi';
      case 'results': return 'Natijalarim';
      case 'progress': return 'O‘qish jarayoni';
      case 'notifications': return 'Bildirishnomalar';
      case 'profile': return 'Mening profilim';
      case 'settings': return 'Sozlamalar';
      case 'admin': return 'Boshqaruv paneli';
      default: return 'InfoEdu LMS';
    }
  };

  const filteredCourses = globalSearchQuery.trim()
    ? courses.filter((c) => c.title.toLowerCase().includes(globalSearchQuery.toLowerCase()) || c.code.toLowerCase().includes(globalSearchQuery.toLowerCase()))
    : [];

  const filteredTests = globalSearchQuery.trim()
    ? (Object.values(tests) as Test[]).filter((t) => t.title.toLowerCase().includes(globalSearchQuery.toLowerCase()) || t.courseName.toLowerCase().includes(globalSearchQuery.toLowerCase()))
    : [];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden">
          <Menu className="w-6 h-6" />
        </button>
        <div><h1 className="text-xl font-semibold text-slate-800">{getPageTitle(activePage)}</h1></div>
      </div>

      <div ref={searchRef} className="relative hidden md:block max-w-md w-full">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={globalSearchQuery}
            onChange={(e) => { setGlobalSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Kurslarni qidirish..."
            className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {searchOpen && globalSearchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-12 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 max-h-80 overflow-y-auto z-50">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Qidiruv natijalari</p>
            {filteredCourses.length === 0 && filteredTests.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">“{globalSearchQuery}” bo‘yicha hech narsa topilmadi.</p>
            ) : (
              <div className="space-y-3">
                {filteredCourses.length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 px-2">Kurslar</span>
                    {filteredCourses.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { navigateTo('course_detail', { courseId: c.id }); setSearchOpen(false); }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 text-left text-xs text-slate-800"
                      >
                        <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-medium truncate">{c.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                {filteredTests.length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 px-2">Testlar</span>
                    {filteredTests.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { navigateTo('test_taking', { testId: t.id }); setSearchOpen(false); }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 text-left text-xs text-slate-800"
                      >
                        <FileQuestion className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-medium truncate">{t.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`relative ${import.meta.env.VITE_DEMO_MODE === 'true' ? '' : 'hidden'}`}>
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
            title="Rolni almashtirish"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
            <span className="capitalize">{user.role === 'student' ? 'Talaba' : user.role === 'teacher' ? 'O‘qituvchi' : 'Admin'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 top-10 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider border-b border-slate-100">Rolni Tanlang</div>
              <button onClick={() => { switchRole('student'); setRoleMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 flex items-center justify-between ${user.role === 'student' ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'}`}>
                Talaba rejimi {user.role === 'student' && <CheckCheck className="w-3.5 h-3.5 text-blue-600" />}
              </button>
              <button onClick={() => { switchRole('teacher'); setRoleMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 flex items-center justify-between ${user.role === 'teacher' ? 'text-purple-600 font-bold bg-purple-50/50' : 'text-slate-700'}`}>
                O‘qituvchi rejimi {user.role === 'teacher' && <CheckCheck className="w-3.5 h-3.5 text-purple-600" />}
              </button>
              <button onClick={() => { switchRole('admin'); setRoleMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 flex items-center justify-between ${user.role === 'admin' ? 'text-rose-600 font-bold bg-rose-50/50' : 'text-slate-700'}`}>
                Admin rejimi {user.role === 'admin' && <CheckCheck className="w-3.5 h-3.5 text-rose-600" />}
              </button>
            </div>
          )}
        </div>

        <button onClick={toggleTheme} className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors" title={theme === 'light' ? 'Qorong‘u rejim (preview)' : 'Yorug‘ rejim'}>
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
        </button>

        <div ref={notifRef} className="relative">
          <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors" title="Bildirishnomalar">
            <Bell className="w-5 h-5" />
            {unreadNotifs.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-800">Bildirishnomalar</h3>
                  {unreadNotifs.length > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600">{unreadNotifs.length} yangi</span>}
                </div>
                {unreadNotifs.length > 0 && <button onClick={markAllNotificationsRead} className="text-[11px] text-blue-600 hover:underline font-medium">Barchasini o‘qilgan qilish</button>}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 text-center">Bildirishnomalar mavjud emas.</p>
                ) : notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markNotificationRead(n.id);
                      if (n.linkTarget) {
                        if (n.linkTarget.startsWith('course-')) navigateTo('course_detail', { courseId: n.linkTarget });
                        else if (n.linkTarget === 'tests') navigateTo('tests');
                        else if (n.linkTarget === 'results') navigateTo('results');
                      }
                      setNotifOpen(false);
                    }}
                    className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${!n.isRead ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-600" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-slate-800 truncate">{n.title}</h4>
                        <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 text-center border-t border-slate-100">
                <button onClick={() => { navigateTo('notifications'); setNotifOpen(false); }} className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                  Barcha bildirishnomalarni ko‘rish →
                </button>
              </div>
            </div>
          )}
        </div>

        <div ref={profileRef} className="relative pl-1 border-l border-slate-200">
          <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none">
            <MediaImage
              src={user.avatarUrl}
              alt={user.fullName}
              label={user.fullName}
              variant="avatar"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-600/20 text-[10px]"
            />
            <span className="hidden xl:inline-block text-xs font-semibold text-slate-800 truncate max-w-[120px]">{user.fullName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline-block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                <div className="mt-1.5 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">{user.group} • {user.studentId}</div>
              </div>
              <div className="py-1">
                <button onClick={() => { navigateTo('profile'); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <User className="w-4 h-4 text-slate-400" /> Mening profilim
                </button>
                <button onClick={() => { navigateTo('settings'); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <Settings className="w-4 h-4 text-slate-400" /> Sozlamalar
                </button>
              </div>
              <div className="border-t border-slate-100 pt-1">
                <button onClick={() => { setProfileOpen(false); logout(); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors">
                  <LogOut className="w-4 h-4 text-rose-500" /> Tizimdan chiqish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
