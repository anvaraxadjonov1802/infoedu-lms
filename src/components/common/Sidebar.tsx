import React from 'react';
import { useLMS, PageView } from '../../context/LMSContext';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Presentation,
  Video,
  FileQuestion,
  Award,
  BarChart2,
  Bell,
  User,
  Settings,
  ShieldAlert,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const { activePage, navigateTo, notifications, user } = useLMS();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const navItems: { id: PageView; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Bosh sahifa', icon: LayoutDashboard },
    { id: 'courses', label: 'Mening kurslarim', icon: BookOpen },
    { id: 'theory', label: 'Nazariy darslar', icon: FileText },
    { id: 'presentations', label: 'Taqdimotlar', icon: Presentation },
    { id: 'videos', label: 'Video darslar', icon: Video },
    { id: 'tests', label: 'Testlar', icon: FileQuestion },
    { id: 'results', label: 'Natijalarim', icon: Award },
    { id: 'progress', label: 'O‘qish jarayoni', icon: BarChart2 },
    { id: 'notifications', label: 'Bildirishnomalar', icon: Bell, badge: unreadCount },
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'settings', label: 'Sozlamalar', icon: Settings },
  ];

  if (user.role === 'admin' || user.role === 'teacher') {
    navItems.push({
      id: 'admin',
      label: user.role === 'admin' ? 'Admin Paneli' : 'O‘qituvchi Paneli',
      icon: ShieldAlert,
    });
  }

  const handleNavClick = (page: PageView) => {
    navigateTo(page);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white/90 backdrop-blur-md border-r border-slate-200/80 transition-all duration-300 flex flex-col justify-between ${
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div>
          {/* Logo Section */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
            <button
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-3 text-left focus:outline-none group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                iE
              </div>
              {(!isCollapsed || mobileOpen) && (
                <div>
                  <h1 className="font-bold text-xl text-slate-900 tracking-tight leading-none">
                    Info<span className="text-indigo-600">Edu</span>
                  </h1>
                </div>
              )}
            </button>

            {/* Collapse toggle button for Desktop */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              title={isCollapsed ? 'Kengaytirish' : 'Kichraytirish'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* User Role Badge preview */}
          {(!isCollapsed || mobileOpen) && (
            <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Foydalanuvchi:</span>
              <span
                className={`px-2 py-0.5 rounded-full font-semibold text-[11px] uppercase ${
                  user.role === 'admin'
                    ? 'bg-rose-100 text-rose-700'
                    : user.role === 'teacher'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'O‘qituvchi' : 'Talaba'}
              </span>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  title={isCollapsed && !mobileOpen ? item.label : undefined}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-indigo-600'
                    }`}
                  />
                  {(!isCollapsed || mobileOpen) && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}
                  {item.badge !== undefined && item.badge > 0 && (!isCollapsed || mobileOpen) && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer User Mini Info */}
        {(!isCollapsed || mobileOpen) && (
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200 shrink-0">
                {user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.fullName}</p>
                <p className="text-xs text-slate-500 truncate">{user.group} guruhi</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
