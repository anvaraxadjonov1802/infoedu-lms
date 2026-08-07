import React from 'react';
import { useLMS } from '../context/LMSContext';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { PresentationViewer } from '../components/presentation/PresentationViewer';
import { EmptyState } from '../components/common/EmptyState';
import { Presentation } from 'lucide-react';
import { adjacentLessons, routeForLesson } from '../services/lessonNavigation';

export const PresentationsPage: React.FC = () => {
  const { presentations, courses, pageParams, navigateTo } = useLMS();

  const presentationId = pageParams.presentationId || Object.keys(presentations)[0];
  const presentation = presentationId ? presentations[presentationId] : undefined;

  if (!presentation) {
    return (
      <EmptyState
        title="Taqdimot topilmadi"
        description="Tanlangan taqdimot fayli mavjud emas."
        actionLabel="Kurslarga qaytish"
        onAction={() => navigateTo('courses')}
        icon={Presentation}
      />
    );
  }

  const adjacent = adjacentLessons(courses, presentation.lessonId);
  const previousRoute = routeForLesson(adjacent.previous);
  const nextRoute = routeForLesson(adjacent.next);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Mening kurslarim', page: 'courses' },
          { label: 'Taqdimotlar' },
          { label: presentation.title },
        ]}
      />

      <PresentationViewer
        presentation={presentation}
        onNextLesson={nextRoute ? () => navigateTo(nextRoute.page, nextRoute.params) : undefined}
        onPrevLesson={previousRoute ? () => navigateTo(previousRoute.page, previousRoute.params) : undefined}
      />
    </div>
  );
};
