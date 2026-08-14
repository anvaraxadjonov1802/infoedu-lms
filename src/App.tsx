import React from 'react';
import { LMSProvider, useLMS } from './context/LMSContext';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { ToastContainer } from './components/common/ToastContainer';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CoursesPage = React.lazy(() => import('./pages/CoursesPage').then((m) => ({ default: m.CoursesPage })));
const CourseDetailPage = React.lazy(() => import('./pages/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage })));
const TheoryLessonPage = React.lazy(() => import('./pages/TheoryLessonPage').then((m) => ({ default: m.TheoryLessonPage })));
const PresentationsPage = React.lazy(() => import('./pages/PresentationsPage').then((m) => ({ default: m.PresentationsPage })));
const VideoLessonsPage = React.lazy(() => import('./pages/VideoLessonsPage').then((m) => ({ default: m.VideoLessonsPage })));
const TestsPage = React.lazy(() => import('./pages/TestsPage').then((m) => ({ default: m.TestsPage })));
const GuardedTestTakingPage = React.lazy(() => import('./pages/GuardedTestTakingPage').then((m) => ({ default: m.GuardedTestTakingPage })));
const TestResultPage = React.lazy(() => import('./pages/TestResultPage').then((m) => ({ default: m.TestResultPage })));
const ResultsPage = React.lazy(() => import('./pages/ResultsPage').then((m) => ({ default: m.ResultsPage })));
const LearningProgressPage = React.lazy(() => import('./pages/LearningProgressPage').then((m) => ({ default: m.LearningProgressPage })));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const AdminManagementView = React.lazy(() => import('./components/admin/AdminManagementView').then((m) => ({ default: m.AdminManagementView })));

const PageLoader: React.FC = () => (
  <div className="min-h-[45vh] flex items-center justify-center">
    <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
      <span className="w-5 h-5 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
      Sahifa yuklanmoqda...
    </div>
  </div>
);

const MainLayout: React.FC = () => {
  const { isAuthenticated, activePage, isBootstrapping } = useLMS();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [authScreen, setAuthScreen] = React.useState<'login' | 'register'>('login');

  React.useEffect(() => {
    if (isAuthenticated) setAuthScreen('login');
  }, [isAuthenticated]);

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
    return authScreen === 'register'
      ? <RegisterPage onBackToLogin={() => setAuthScreen('login')} />
      : <LoginPage onRegister={() => setAuthScreen('register')} />;
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
        return <GuardedTestTakingPage />;
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
    <div className="app-shell min-h-screen font-sans flex flex-col md:flex-row antialiased selection:bg-indigo-600 selection:text-white">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Header setMobileOpen={setMobileOpen} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <React.Suspense fallback={<PageLoader />}>
            {renderActivePage()}
          </React.Suspense>
        </main>
      </div>
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
