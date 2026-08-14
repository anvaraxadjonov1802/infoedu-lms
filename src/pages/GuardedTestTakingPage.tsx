import React from 'react';
import { LockKeyhole, RotateCcw } from 'lucide-react';
import { useLMS } from '../context/LMSContext';
import { EmptyState } from '../components/common/EmptyState';
import { TestTakingPage } from './TestTakingPage';

export const GuardedTestTakingPage: React.FC = () => {
  const { tests, courses, pageParams, navigateTo } = useLMS();

  const testId = pageParams.testId as string | undefined;
  const test = testId ? tests[testId] : undefined;

  if (!test) {
    return <TestTakingPage />;
  }

  const lesson = courses
    .flatMap((course) => course.modules)
    .flatMap((module) => module.lessons)
    .find((item) => item.testId === test.id);

  if (lesson?.isLocked) {
    return (
      <EmptyState
        title="Test hali ochilmagan"
        description="Avval oldingi darsni yakunlang. Shundan keyin test avtomatik ochiladi."
        actionLabel="Kursga qaytish"
        onAction={() => navigateTo('course_detail', { courseId: test.courseId })}
        icon={LockKeyhole}
      />
    );
  }

  if (test.attemptsUsed >= test.attemptsAllowed) {
    return (
      <EmptyState
        title="Urinishlar tugagan"
        description={`Bu test uchun ruxsat etilgan ${test.attemptsAllowed} ta urinishdan foydalanib bo‘lgansiz.`}
        actionLabel="Natijalarga o‘tish"
        onAction={() => navigateTo('results')}
        icon={RotateCcw}
      />
    );
  }

  return <TestTakingPage />;
};
