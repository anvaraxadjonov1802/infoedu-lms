import type { Course, Lesson } from '../types/lms';
import type { PageView } from '../context/LMSContext';

export interface LessonRoute {
  page: PageView;
  params: Record<string, string>;
}

export function routeForLesson(lesson?: Lesson | null): LessonRoute | null {
  if (!lesson) return null;
  if (lesson.type === 'theory' || lesson.type === 'practical' || lesson.type === 'independent') {
    return {
      page: 'theory',
      params: lesson.theoryId ? { theoryId: lesson.theoryId } : { lessonId: lesson.id },
    };
  }
  if (lesson.type === 'presentation' && lesson.presentationId) return { page: 'presentations', params: { presentationId: lesson.presentationId } };
  if (lesson.type === 'video' && lesson.videoId) return { page: 'videos', params: { videoId: lesson.videoId } };
  if (lesson.type === 'test' && lesson.testId) return { page: 'test_taking', params: { testId: lesson.testId } };
  return null;
}

export function adjacentLessons(courses: Course[], currentLessonId: string) {
  for (const course of courses) {
    const lessons = [...course.modules]
      .sort((a, b) => a.order - b.order)
      .flatMap((module) => [...module.lessons].sort((a, b) => a.order - b.order));
    const index = lessons.findIndex((lesson) => lesson.id === currentLessonId);
    if (index >= 0) {
      return {
        previous: index > 0 ? lessons[index - 1] : null,
        next: index < lessons.length - 1 ? lessons[index + 1] : null,
      };
    }
  }
  return { previous: null, next: null };
}
