import React from 'react';
import { useLMS } from '../context/LMSContext';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { TheoryReader } from '../components/theory/TheoryReader';
import { EmptyState } from '../components/common/EmptyState';
import { FileText } from 'lucide-react';
import { adjacentLessons, routeForLesson } from '../services/lessonNavigation';

export const TheoryLessonPage: React.FC = () => {
  const { theoryLessons, courses, pageParams, navigateTo } = useLMS();

  const theoryId = pageParams.theoryId || Object.keys(theoryLessons)[0];
  const theory = theoryId ? theoryLessons[theoryId] : undefined;

  if (!theory) {
    return (
      <EmptyState
        title="Nazariy dars topilmadi"
        description="Tanlangan dars ID bazada mavjud emas."
        actionLabel="Kurslarga qaytish"
        onAction={() => navigateTo('courses')}
        icon={FileText}
      />
    );
  }

  const adjacent = adjacentLessons(courses, theory.lessonId);
  const previousRoute = routeForLesson(adjacent.previous);
  const nextRoute = routeForLesson(adjacent.next);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Mening kurslarim', page: 'courses' },
          { label: 'Nazariy darslar' },
          { label: theory.title },
        ]}
      />

      <TheoryReader
        theoryData={theory}
        onNextLesson={nextRoute ? () => navigateTo(nextRoute.page, nextRoute.params) : undefined}
        onPrevLesson={previousRoute ? () => navigateTo(previousRoute.page, previousRoute.params) : undefined}
      />
    </div>
  );
};
