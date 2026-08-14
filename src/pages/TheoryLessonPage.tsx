import React from 'react';
import { useLMS } from '../context/LMSContext';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { TheoryReader } from '../components/theory/TheoryReader';
import { WordTheoryReader } from '../components/theory/WordTheoryReader';
import { PdfTheoryReader } from '../components/theory/PdfTheoryReader';
import { EmptyState } from '../components/common/EmptyState';
import { FileText } from 'lucide-react';
import { adjacentLessons, routeForLesson } from '../services/lessonNavigation';

export const TheoryLessonPage: React.FC = () => {
  const { theoryLessons, courses, pageParams, navigateTo, markLessonCompleted } = useLMS();

  const lessonId = pageParams.lessonId as string | undefined;
  const fallbackTheory = lessonId
    ? Object.values(theoryLessons).find((item) => item.lessonId === lessonId)
    : undefined;
  const theoryId = pageParams.theoryId || fallbackTheory?.id || Object.keys(theoryLessons)[0];
  const theory = theoryId ? theoryLessons[theoryId] : undefined;

  if (!theory) {
    return (
      <EmptyState
        title="Material topilmadi"
        description="Tanlangan dars uchun matnli material hali kiritilmagan."
        actionLabel="Kurslarga qaytish"
        onAction={() => navigateTo('courses')}
        icon={FileText}
      />
    );
  }

  const currentLesson = courses
    .flatMap((course) => course.modules)
    .flatMap((module) => module.lessons)
    .find((lesson) => lesson.id === theory.lessonId);

  const materialLabel = currentLesson?.type === 'practical'
    ? 'Amaliy ish'
    : currentLesson?.type === 'independent'
      ? 'Mustaqil ish'
      : 'Nazariy material';

  const adjacent = adjacentLessons(courses, theory.lessonId);
  const previousRoute = routeForLesson(adjacent.previous);
  const nextRoute = routeForLesson(adjacent.next);

  const hasPdfPreview = theory.attachments.some((attachment) => {
    const type = String(attachment.type || '').toLowerCase();
    const kind = String((attachment as any).kind || '').toLowerCase();
    return type === 'pdf' && kind === 'word-preview';
  });

  const hasOriginalDocx = theory.attachments.some((attachment) => {
    const type = (attachment.type || '').toLowerCase();
    const name = (attachment.name || '').toLowerCase();
    return type === 'docx' || name.endsWith('.docx');
  });

  const handleNextLesson = nextRoute
    ? async () => {
        await markLessonCompleted(theory.courseId || '', theory.lessonId);
        navigateTo(nextRoute.page, nextRoute.params);
      }
    : undefined;

  const handlePrevLesson = previousRoute
    ? () => navigateTo(previousRoute.page, previousRoute.params)
    : undefined;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Mening kurslarim', page: 'courses' },
          { label: materialLabel },
          { label: theory.title },
        ]}
      />

      {hasPdfPreview ? (
        <PdfTheoryReader
          theoryData={theory}
          onNextLesson={handleNextLesson}
          onPrevLesson={handlePrevLesson}
        />
      ) : hasOriginalDocx ? (
        <WordTheoryReader
          theoryData={theory}
          onNextLesson={handleNextLesson}
          onPrevLesson={handlePrevLesson}
        />
      ) : (
        <TheoryReader
          theoryData={theory}
          onNextLesson={handleNextLesson}
          onPrevLesson={handlePrevLesson}
        />
      )}
    </div>
  );
};
