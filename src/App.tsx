import React from 'react';
import { LMSProvider, useLMS } from './context/LMSContext';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { ToastContainer } from './components/common/ToastContainer';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { TheoryLessonPage } from './pages/TheoryLessonPage';
import { PresentationsPage } from './pages/PresentationsPage';
import { VideoLessonsPage } from './pages/VideoLessonsPage';
import { TestsPage } from './pages/TestsPage';
import { TestTakingPage } from './pages/TestTakingPage';
import { TestResultPage } from './pages/TestResultPage';
import { ResultsPage } from './pages/ResultsPage';
import { LearningProgressPage } from './pages/LearningProgressPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminManagementView } from './components/admin/AdminManagementView';

const MainLayout: React.FC = () => {
  const { isAuthenticated, activePage, isBootstrapping } = useLMS();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Platforma yuklanmoqda...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'courses':
        return <CoursesPage />;
      case 'course_detail':
        return <CourseDetailPage />;
      case 'theory':
        return <TheoryLessonPage />;
      case 'presentations':
        return <PresentationsPage />;
      case 'videos':
        return <VideoLessonsPage />;
      case 'tests':
        return <TestsPage />;
      case 'test_taking':
        return <TestTakingPage />;
      case 'test_result':
        return <TestResultPage />;
      case 'results':
        return <ResultsPage />;
      case 'progress':
        return <LearningProgressPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage />;
      case 'admin':
        return <AdminManagementView />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col md:flex-row antialiased selection:bg-indigo-600 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Header setMobileOpen={setMobileOpen} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {renderActivePage()}
        </main>
      </div>

      {/* Toast Notifications Overlay */}
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <LMSProvider>
      <MainLayout />
    </LMSProvider>
  );
}

export default App;
