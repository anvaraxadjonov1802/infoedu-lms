export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  id: string;
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  university: string;
  faculty: string;
  group: string;
  role: UserRole;
  avatarUrl: string;
  registrationDate: string;
  overallProgress: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  averageScore: number;
  studyStreakDays: number;
  longestStreakDays: number;
  totalStudyMinutes: number;
  activeCoursesCount: number;
}

export type LessonType = 'theory' | 'practical' | 'independent' | 'presentation' | 'video' | 'test';

export interface Lesson {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  type: LessonType;
  durationMinutes: number;
  order: number;
  isCompleted: boolean;
  isLocked: boolean;
  isCurrent?: boolean;
  description?: string;
  theoryId?: string;
  presentationId?: string;
  videoId?: string;
  testId?: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

export interface Teacher {
  id: string;
  name: string;
  title: string;
  avatarUrl: string;
  department: string;
  email: string;
}

export type CourseStatus = 'not_started' | 'in_progress' | 'completed';

export interface Course {
  id: string;
  title: string;
  code: string;
  coverImage: string;
  category: string;
  level: string;
  description: string;
  teacher: Teacher;
  totalModulesCount: number;
  totalLessonsCount: number;
  estimatedStudyHours: number;
  progressPercentage: number;
  lastAccessedDate: string;
  status: CourseStatus;
  tags: string[];
  modules: Module[];
}

export interface TheoryLessonContent {
  id: string;
  lessonId: string;
  courseId?: string;
  title: string;
  readingTimeMinutes: number;
  summary: string;
  sections: {
    id: string;
    title: string;
    contentMarkdown: string;
    callout?: {
      type: 'info' | 'warning' | 'tip' | 'formula';
      title: string;
      text: string;
    };
    codeSnippet?: {
      language: string;
      code: string;
    };
  }[];
  attachments: {
    id: string;
    name: string;
    size: string;
    type: string;
    downloadUrl: string;
  }[];
  notes?: string;
  isBookmarked?: boolean;
}

export interface PresentationSlide {
  slideNumber: number;
  title: string;
  subtitle?: string;
  bulletPoints: string[];
  codeOrFormula?: string;
  imageUrl?: string;
  speakerNote?: string;
}

export interface PresentationData {
  id: string;
  lessonId: string;
  courseId: string;
  courseName: string;
  moduleName: string;
  title: string;
  totalSlides: number;
  fileType: 'pdf' | 'pptx';
  fileSize: string;
  uploadDate: string;
  downloadUrl: string;
  embedUrl?: string;
  slides: PresentationSlide[];
}

export interface VideoResource {
  id: string;
  title: string;
  fileType: string;
  fileSize: string;
  downloadUrl: string;
}

export interface VideoData {
  id: string;
  lessonId: string;
  courseId: string;
  courseName: string;
  moduleName: string;
  title: string;
  teacherName: string;
  durationMinutes: number;
  durationSeconds: number;
  videoUrl: string;
  embedType: 'youtube' | 'vimeo' | 'direct';
  description: string;
  lastPositionSeconds: number;
  watchedPercentage: number;
  isCompleted: boolean;
  resources: VideoResource[];
  transcript?: string;
}

export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'short_text';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  testId: string;
  questionText: string;
  type: QuestionType;
  options?: QuestionOption[];
  correctAnswer?: string | string[] | boolean;
  explanation: string;
  points: number;
  codeSnippet?: string;
}

export type TestStatus = 'not_started' | 'in_progress' | 'submitted' | 'passed' | 'retake_needed';

export interface Test {
  id: string;
  courseId: string;
  courseName: string;
  moduleId: string;
  moduleName: string;
  title: string;
  questionCount: number;
  timeLimitMinutes: number;
  attemptsAllowed: number;
  attemptsUsed: number;
  passingScorePercent: number;
  bestScorePercent: number;
  status: TestStatus;
  questions: Question[];
}

export interface UserAnswer {
  questionId: string;
  answer: string | string[] | boolean;
  isFlaggedForReview?: boolean;
}

export interface TopicBreakdown {
  topic: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface AnswerReview {
  questionId: string;
  questionText: string;
  userAnswerText: string;
  correctAnswerText: string;
  isCorrect: boolean;
  explanation: string;
}

export interface TestResult {
  id: string;
  testId: string;
  testTitle: string;
  courseName: string;
  score: number;
  maxScore: number;
  percentage: number;
  passingScorePercent: number;
  isPassed: boolean;
  date: string;
  timeSpentSeconds: number;
  attemptNumber: number;
  correctAnswersCount: number;
  incorrectAnswersCount: number;
  unansweredCount: number;
  topicBreakdowns: TopicBreakdown[];
  answerReviews: AnswerReview[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  time: string;
  isRead: boolean;
  type: 'lesson' | 'test' | 'result' | 'announcement' | 'system';
  linkTarget?: string;
}

export interface DailyActivity {
  day: string;
  dayShort: string;
  minutesSpent: number;
  lessonsCompleted: number;
  testsCompleted: number;
  dateStr: string;
}

export interface Certificate {
  id: string;
  courseTitle: string;
  issuedDate: string;
  certificateCode: string;
  grade: string;
}

export interface StudentAchievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlockedDate: string;
  isUnlocked: boolean;
}

export interface AdminStudent {
  id: string;
  fullName: string;
  studentId: string;
  group: string;
  faculty: string;
  activeCourses: number;
  averageScore: number;
  status: 'active' | 'inactive';
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  author: string;
  date: string;
  targetGroup: string;
  content: string;
}
