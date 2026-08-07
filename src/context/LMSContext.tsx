import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Course,
  DailyActivity,
  NotificationItem,
  PresentationData,
  Test,
  TestResult,
  TheoryLessonContent,
  UserProfile,
  UserRole,
  VideoData,
} from '../types/lms';
import {
  calculateCourseProgress,
  calculateOverallProgress,
  loadLMSState,
  saveLMSState,
} from '../services/lmsService';
import { api } from '../services/api';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export type PageView =
  | 'login'
  | 'dashboard'
  | 'courses'
  | 'course_detail'
  | 'theory'
  | 'presentations'
  | 'videos'
  | 'tests'
  | 'test_taking'
  | 'test_result'
  | 'results'
  | 'progress'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'admin';

export interface LMSContextType {
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  activePage: PageView;
  pageParams: Record<string, any>;
  navigateTo: (page: PageView, params?: Record<string, any>) => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;

  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;

  language: 'uz' | 'ru' | 'en';
  setLanguage: (lang: 'uz' | 'ru' | 'en') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  user: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  switchRole: (role: UserRole) => void;

  courses: Course[];
  theoryLessons: Record<string, TheoryLessonContent>;
  presentations: Record<string, PresentationData>;
  videos: Record<string, VideoData>;
  tests: Record<string, Test>;
  testResults: TestResult[];
  notifications: NotificationItem[];
  weeklyActivities: DailyActivity[];

  markLessonCompleted: (courseId: string, lessonId: string) => Promise<void>;
  toggleTheoryBookmark: (theoryId: string) => void;
  saveTheoryNotes: (theoryId: string, notes: string) => void;
  updateVideoProgress: (videoId: string, seconds: number, percentage: number, markCompleted?: boolean) => void;
  saveTestResult: (result: TestResult) => void;
  submitTest: (testId: string, answers: Record<string, unknown>, flaggedQuestionIds: string[], timeSpentSeconds: number) => Promise<TestResult>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  toasts: ToastMessage[];
  addToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  resetAllData: () => void;
  reloadFromServer: () => Promise<void>;
}

const LMSContext = createContext<LMSContextType | undefined>(undefined);

export const LMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState(() => loadLMSState());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(api.hasSession());
  const [activePage, setActivePage] = useState<PageView>('dashboard');
  const [pageParams, setPageParams] = useState<Record<string, any>>({});
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [language, setLanguage] = useState<'uz' | 'ru' | 'en'>(() => (localStorage.getItem('infoedu_language') as 'uz' | 'ru' | 'en') || 'uz');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('infoedu_theme') as 'light' | 'dark') || 'light');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    saveLMSState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('infoedu_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('infoedu_language', language);
  }, [language]);

  const addToast = (title: string, message: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4000);
  };

  const removeToast = (id: string) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  const navigateTo = (page: PageView, params: Record<string, any> = {}) => {
    setActivePage(page);
    setPageParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reloadFromServer = async () => {
    const next = await api.bootstrap();
    setState(next);
  };

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!api.hasSession()) {
        setIsBootstrapping(false);
        return;
      }
      try {
        const next = await api.bootstrap();
        if (!cancelled) {
          setState(next);
          setIsAuthenticated(true);
        }
      } catch {
        api.clearSession();
        if (!cancelled) setIsAuthenticated(false);
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    };
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string, rememberMe = true) => {
    const auth = await api.login(email, password, rememberMe);
    setState((prev) => ({ ...prev, user: auth.user }));
    const next = await api.bootstrap();
    setState(next);
    setIsAuthenticated(true);
    navigateTo(next.user.role === 'admin' || next.user.role === 'teacher' ? 'admin' : 'dashboard');
    addToast('Xush kelibsiz!', 'Platformaga muvaffaqiyatli kirdingiz.', 'success');
  };

  const demoLogin = async (role: UserRole) => {
    const auth = await api.demoLogin(role);
    setState((prev) => ({ ...prev, user: auth.user }));
    const next = await api.bootstrap();
    setState(next);
    setIsAuthenticated(true);
    navigateTo(role === 'admin' || role === 'teacher' ? 'admin' : 'dashboard');
    addToast('Demo rejim', `${role === 'student' ? 'Talaba' : role === 'teacher' ? 'O‘qituvchi' : 'Admin'} sifatida kirdingiz.`, 'success');
  };

  const logout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    setActivePage('login');
    setPageParams({});
    addToast('Tizimdan chiqildi', 'Seans yakunlandi.', 'info');
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    addToast('Mavzu o‘zgartirildi', next === 'dark' ? 'Qorong‘u rejim yoqildi.' : 'Yorug‘ rejim yoqildi.', 'info');
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    const updated = await api.updateProfile(updates);
    setState((prev) => ({ ...prev, user: updated }));
    addToast('Profil yangilandi', 'Shaxsiy ma’lumotlaringiz saqlandi.', 'success');
  };

  // Role switcher is only a UI-preview helper. Real authorization is always enforced by backend.
  const switchRole = (role: UserRole) => {
    if (import.meta.env.VITE_DEMO_MODE !== 'true') {
      addToast('Ruxsat yo‘q', 'Rolni faqat administrator server tomonda o‘zgartira oladi.', 'warning');
      return;
    }
    setState((prev) => ({ ...prev, user: { ...prev.user, role } }));
    navigateTo(role === 'admin' || role === 'teacher' ? 'admin' : 'dashboard');
  };

  const markLessonCompleted = async (_courseId: string, lessonId: string) => {
    try {
      await api.markLessonCompleted(lessonId);
      const next = await api.bootstrap();
      setState(next);
      addToast('Dars yakunlandi!', 'O‘zlashtirish darajangiz va keyingi dars holati yangilandi.', 'success');
    } catch (error) {
      addToast('Saqlash xatosi', error instanceof Error ? error.message : 'Dars holatini serverga saqlab bo‘lmadi.', 'error');
      throw error;
    }
  };

  const toggleTheoryBookmark = (theoryId: string) => {
    const existing = state.theoryLessons[theoryId];
    if (!existing) return;
    const isBookmarked = !existing.isBookmarked;
    setState((prev) => ({ ...prev, theoryLessons: { ...prev.theoryLessons, [theoryId]: { ...prev.theoryLessons[theoryId], isBookmarked } } }));
    api.updateTheory(theoryId, { isBookmarked }).catch(() => addToast('Sinxronlash xatosi', 'Xatcho‘p serverga saqlanmadi.', 'error'));
  };

  const saveTheoryNotes = (theoryId: string, notes: string) => {
    setState((prev) => ({ ...prev, theoryLessons: { ...prev.theoryLessons, [theoryId]: { ...prev.theoryLessons[theoryId], notes } } }));
    api.updateTheory(theoryId, { notes }).catch(() => addToast('Sinxronlash xatosi', 'Qayd serverga saqlanmadi.', 'error'));
    addToast('Qaydlar saqlandi', 'Shaxsiy eslatmalaringiz yangilandi.', 'success');
  };

  const updateVideoProgress = (videoId: string, seconds: number, percentage: number, markCompleted = false) => {
    const shouldComplete = markCompleted || percentage >= 90;
    const wasCompleted = state.videos[videoId]?.isCompleted ?? false;
    setState((prev) => {
      const existing = prev.videos[videoId];
      if (!existing) return prev;
      let courses = prev.courses;
      let user = prev.user;
      if (shouldComplete && !existing.isCompleted) {
        courses = prev.courses.map((course) => {
          if (course.id !== existing.courseId) return course;
          const modules = course.modules.map((module) => ({
            ...module,
            lessons: module.lessons.map((lesson) => lesson.id === existing.lessonId ? { ...lesson, isCompleted: true } : lesson),
          }));
          const updatedCourse = { ...course, modules };
          const progress = calculateCourseProgress(updatedCourse);
          return { ...updatedCourse, progressPercentage: progress, status: progress === 100 ? 'completed' : 'in_progress' } as Course;
        });
        const totals = calculateOverallProgress(courses);
        user = { ...user, overallProgress: totals.overallPercentage, completedLessonsCount: totals.completedLessons, totalLessonsCount: totals.totalLessons };
      }
      return {
        ...prev,
        courses,
        user,
        videos: {
          ...prev.videos,
          [videoId]: {
            ...existing,
            lastPositionSeconds: seconds,
            watchedPercentage: Math.max(existing.watchedPercentage, percentage),
            isCompleted: shouldComplete || existing.isCompleted,
          },
        },
      };
    });
    api.updateVideoProgress(videoId, { seconds, percentage, markCompleted })
      .then(async (response) => {
        setState((prev) => ({ ...prev, user: { ...prev.user, totalStudyMinutes: response.totalStudyMinutes } }));
        if (response.isCompleted && !wasCompleted) {
          try {
            const next = await api.bootstrap();
            setState(next);
          } catch {
            // Progress itself is already persisted; a later bootstrap will reconcile the UI.
          }
        }
      })
      .catch(() => undefined);
  };

  // Kept for compatibility with old demo flows; production test-taking uses submitTest().
  const saveTestResult = (result: TestResult) => {
    setState((prev) => ({
      ...prev,
      testResults: [result, ...prev.testResults.filter((item) => item.id !== result.id)],
      user: {
        ...prev.user,
        averageScore: Math.round(([result, ...prev.testResults].reduce((sum, item) => sum + item.percentage, 0)) / (prev.testResults.length + 1)),
      },
    }));
  };

  const submitTest = async (testId: string, answers: Record<string, unknown>, flaggedQuestionIds: string[], timeSpentSeconds: number) => {
    const result = await api.submitTest(testId, { answers, flaggedQuestionIds, timeSpentSeconds });
    setState((prev) => {
      const test = prev.tests[testId];
      const tests = test
        ? {
            ...prev.tests,
            [testId]: {
              ...test,
              attemptsUsed: result.attemptNumber,
              bestScorePercent: Math.max(test.bestScorePercent, result.percentage),
              status: result.isPassed ? 'passed' : 'retake_needed',
            } as Test,
          }
        : prev.tests;
      const results = [result, ...prev.testResults.filter((item) => item.id !== result.id)];
      return {
        ...prev,
        tests,
        testResults: results,
        user: { ...prev.user, averageScore: Math.round(results.reduce((sum, item) => sum + item.percentage, 0) / Math.max(results.length, 1)) },
      };
    });
    try {
      const next = await api.bootstrap();
      setState(next);
    } catch {
      // The just-submitted result is already stored locally; a later bootstrap will reconcile it.
    }
    addToast(result.isPassed ? 'Tabriklaymiz!' : 'Test yakunlandi', `${result.percentage}% natija qayd etildi.`, result.isPassed ? 'success' : 'warning');
    return result;
  };

  const markNotificationRead = (id: string) => {
    setState((prev) => ({ ...prev, notifications: prev.notifications.map((item) => (item.id === id ? { ...item, isRead: true } : item)) }));
    api.markNotificationRead(id).catch(() => undefined);
  };

  const markAllNotificationsRead = () => {
    setState((prev) => ({ ...prev, notifications: prev.notifications.map((item) => ({ ...item, isRead: true })) }));
    api.markAllNotificationsRead().catch(() => undefined);
    addToast('Bildirishnomalar', 'Barcha bildirishnomalar o‘qilgan deb belgilandi.', 'info');
  };

  const resetAllData = () => {
    localStorage.removeItem('infoedu_lms_state_v1');
    setState(loadLMSState());
    addToast('Mahalliy kesh tozalandi', 'Serverdagi ma’lumotlarga ta’sir qilinmadi.', 'info');
  };

  const value = useMemo<LMSContextType>(() => ({
    isAuthenticated,
    isBootstrapping,
    activePage,
    pageParams,
    navigateTo,
    login,
    demoLogin,
    logout,
    globalSearchQuery,
    setGlobalSearchQuery,
    language,
    setLanguage,
    theme,
    toggleTheme,
    user: state.user,
    updateUserProfile,
    switchRole,
    courses: state.courses,
    theoryLessons: state.theoryLessons,
    presentations: state.presentations,
    videos: state.videos,
    tests: state.tests,
    testResults: state.testResults,
    notifications: state.notifications,
    weeklyActivities: state.weeklyActivities || [],
    markLessonCompleted,
    toggleTheoryBookmark,
    saveTheoryNotes,
    updateVideoProgress,
    saveTestResult,
    submitTest,
    markNotificationRead,
    markAllNotificationsRead,
    toasts,
    addToast,
    removeToast,
    resetAllData,
    reloadFromServer,
  }), [
    isAuthenticated,
    isBootstrapping,
    activePage,
    pageParams,
    globalSearchQuery,
    language,
    theme,
    state,
    toasts,
  ]);

  return <LMSContext.Provider value={value}>{children}</LMSContext.Provider>;
};

export const useLMS = () => {
  const context = useContext(LMSContext);
  if (!context) throw new Error('useLMS must be used within an LMSProvider');
  return context;
};
