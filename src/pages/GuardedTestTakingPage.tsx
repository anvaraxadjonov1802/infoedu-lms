import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useLMS } from '../context/LMSContext';
import { EmptyState } from '../components/common/EmptyState';
import { TestTakingPage } from './TestTakingPage';

export const GuardedTestTakingPage: React.FC = () => {
  const { tests, pageParams, navigateTo } = useLMS();

  const testId = pageParams.testId as string | undefined;
  const test = testId ? tests[testId] : undefined;

  // Lesson unlock state can be a few milliseconds stale while the lean bootstrap
  // refresh runs in the background. TestTakingPage fetches /tests/<id>/ and the
  // backend is the authoritative access guard, so do not reject access from a
  // stale client-side isLocked flag here.
  if (!test) {
    return <TestTakingPage />;
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
