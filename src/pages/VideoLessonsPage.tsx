import React from 'react';
import { useLMS } from '../context/LMSContext';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { VideoPlayer } from '../components/video/VideoPlayer';
import { EmptyState } from '../components/common/EmptyState';
import { ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { adjacentLessons, routeForLesson } from '../services/lessonNavigation';

export const VideoLessonsPage: React.FC = () => {
  const { videos, courses, pageParams, navigateTo } = useLMS();

  const videoId = pageParams.videoId || Object.keys(videos)[0];
  const video = videoId ? videos[videoId] : undefined;

  const course = courses.find((c) => c.id === video?.courseId);
  const playlist = course?.modules.flatMap((m) => m.lessons.filter((l) => l.type === 'video')) || [];

  if (!video) {
    return (
      <EmptyState
        title="Video dars topilmadi"
        description="Tanlangan video dars mavjud emas."
        actionLabel="Kurslarga qaytish"
        onAction={() => navigateTo('courses')}
        icon={Video}
      />
    );
  }

  const adjacent = adjacentLessons(courses, video.lessonId);
  const previousRoute = routeForLesson(adjacent.previous);
  const nextRoute = routeForLesson(adjacent.next);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Mening kurslarim', page: 'courses' },
          { label: 'Video darslar' },
          { label: video.title },
        ]}
      />

      <VideoPlayer
        video={video}
        playlist={playlist}
        onSelectPlaylistItem={(lesson) => {
          if (lesson.videoId) navigateTo('videos', { videoId: lesson.videoId });
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={previousRoute ? () => navigateTo(previousRoute.page, previousRoute.params) : undefined}
          disabled={!previousRoute}
          className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Oldingi dars
        </button>
        <button
          onClick={nextRoute ? () => navigateTo(nextRoute.page, nextRoute.params) : undefined}
          disabled={!nextRoute}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 flex items-center gap-2"
        >
          Keyingi dars <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
