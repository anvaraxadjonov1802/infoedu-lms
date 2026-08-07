import {
  UserProfile,
  Course,
  TheoryLessonContent,
  PresentationData,
  VideoData,
  Test,
  TestResult,
  NotificationItem,
  DailyActivity,
  UserRole,
} from '../types/lms';
import {
  mockStudent,
  mockCourses,
  mockTheoryLessons,
  mockPresentations,
  mockVideos,
  mockTests,
  mockTestResults,
  mockNotifications,
  mockWeeklyActivities,
} from '../data/mockData';

const STORAGE_KEY = 'infoedu_lms_state_v1';

export interface LMSLocalState {
  user: UserProfile;
  courses: Course[];
  theoryLessons: Record<string, TheoryLessonContent>;
  presentations: Record<string, PresentationData>;
  videos: Record<string, VideoData>;
  tests: Record<string, Test>;
  testResults: TestResult[];
  notifications: NotificationItem[];
  weeklyActivities: DailyActivity[];
}

export function loadLMSState(): LMSLocalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load state from localStorage', e);
  }

  // Initial State
  const initialState: LMSLocalState = {
    user: { ...mockStudent },
    courses: mockCourses,
    theoryLessons: mockTheoryLessons,
    presentations: mockPresentations,
    videos: mockVideos,
    tests: mockTests,
    testResults: mockTestResults,
    notifications: mockNotifications,
    weeklyActivities: mockWeeklyActivities,
  };

  saveLMSState(initialState);
  return initialState;
}

export function saveLMSState(state: LMSLocalState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state to localStorage', e);
  }
}

export function calculateCourseProgress(course: Course): number {
  let totalLessons = 0;
  let completedLessons = 0;

  course.modules.forEach((mod) => {
    mod.lessons.forEach((les) => {
      totalLessons++;
      if (les.isCompleted) completedLessons++;
    });
  });

  if (totalLessons === 0) return course.progressPercentage || 0;
  return Math.round((completedLessons / totalLessons) * 100);
}

export function calculateOverallProgress(courses: Course[]): {
  overallPercentage: number;
  completedLessons: number;
  totalLessons: number;
} {
  let total = 0;
  let completed = 0;

  courses.forEach((c) => {
    c.modules.forEach((mod) => {
      mod.lessons.forEach((les) => {
        total++;
        if (les.isCompleted) completed++;
      });
    });
  });

  const overallPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { overallPercentage, completedLessons: completed, totalLessons: total };
}
