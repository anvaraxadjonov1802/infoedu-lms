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
} from '../types/lms';

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

const EMPTY_USER: UserProfile = {
  id: '',
  fullName: '',
  studentId: '',
  email: '',
  phone: '',
  university: '',
  faculty: '',
  group: '',
  role: 'student',
  avatarUrl: '',
  registrationDate: '',
  overallProgress: 0,
  completedLessonsCount: 0,
  totalLessonsCount: 0,
  averageScore: 0,
  studyStreakDays: 0,
  longestStreakDays: 0,
  totalStudyMinutes: 0,
  activeCoursesCount: 0,
};

const EMPTY_STATE: LMSLocalState = {
  user: EMPTY_USER,
  courses: [],
  theoryLessons: {},
  presentations: {},
  videos: {},
  tests: {},
  testResults: [],
  notifications: [],
  weeklyActivities: [],
};

/**
 * Server data is the source of truth in production. Keeping the complete LMS
 * payload (hundreds of questions and lesson bodies) in localStorage caused a
 * large synchronous JSON.parse on startup and JSON.stringify after updates.
 * Start light and hydrate from /api/bootstrap/ instead.
 */
export function loadLMSState(): LMSLocalState {
  return {
    ...EMPTY_STATE,
    user: { ...EMPTY_USER },
    courses: [],
    theoryLessons: {},
    presentations: {},
    videos: {},
    tests: {},
    testResults: [],
    notifications: [],
    weeklyActivities: [],
  };
}

/**
 * Kept as a compatibility no-op for callers. UI preferences such as theme and
 * language already have their own small localStorage keys.
 */
export function saveLMSState(_state: LMSLocalState): void {
  // Intentionally not persisted: authenticated LMS content comes from API.
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
