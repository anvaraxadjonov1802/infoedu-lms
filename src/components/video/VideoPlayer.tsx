import React, { useEffect, useRef, useState } from 'react';
import { VideoData, Lesson } from '../../types/lms';
import { useLMS } from '../../context/LMSContext';
import {
  PlayCircle,
  CheckCircle,
  Download,
  FileText,
  Clock,
  User,
  BookOpen,
  Volume2,
  ListVideo,
} from 'lucide-react';

interface VideoPlayerProps {
  video: VideoData;
  playlist?: Lesson[];
  onSelectPlaylistItem?: (lesson: Lesson) => void;
}

const getYouTubeEmbedUrl = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  let videoId = '';
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const parts = parsed.pathname.split('/').filter(Boolean);

    if (host === 'youtu.be') {
      videoId = parts[0] || '';
    } else if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') || '';
      } else if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') {
        videoId = parts[1] || '';
      }
    }
  } catch {
    // Fall through to tolerant regex parsing for malformed/legacy URLs.
  }

  if (!videoId) {
    const match = raw.match(
      /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?.*?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/i,
    );
    videoId = match?.[1] || '';
  }

  if (!videoId && /^[A-Za-z0-9_-]{6,}$/.test(raw)) {
    videoId = raw;
  }

  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : raw;
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  playlist = [],
  onSelectPlaylistItem,
}) => {
  const { updateVideoProgress, addToast } = useLMS();

  const [activeTab, setActiveTab] = useState<'description' | 'resources' | 'transcript'>('description');
  const [isCompleted, setIsCompleted] = useState(video.isCompleted);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<any>(null);
  const syncTimerRef = useRef<number | null>(null);

  const iframeBaseUrl = video.embedType === 'youtube'
    ? getYouTubeEmbedUrl(video.videoUrl)
    : video.videoUrl;
  const iframeSrc = iframeBaseUrl
    ? `${iframeBaseUrl}${iframeBaseUrl.includes('?') ? '&' : '?'}autoplay=0&rel=0&enablejsapi=1&playsinline=1`
    : '';

  useEffect(() => {
    setIsCompleted(video.isCompleted);
  }, [video.id, video.isCompleted]);

  useEffect(() => {
    if (video.embedType !== 'youtube' || !iframeRef.current || !iframeSrc) return;

    let cancelled = false;
    const setupPlayer = () => {
      if (cancelled || !iframeRef.current || !(window as any).YT?.Player) return;
      try {
        playerRef.current = new (window as any).YT.Player(iframeRef.current, {
          events: {
            onReady: (event: any) => {
              if (video.lastPositionSeconds > 5) {
                try { event.target.seekTo(video.lastPositionSeconds, true); } catch { /* optional resume */ }
              }
            },
            onStateChange: (event: any) => {
              const PLAYING = (window as any).YT?.PlayerState?.PLAYING ?? 1;
              if (event.data === PLAYING && syncTimerRef.current === null) {
                syncTimerRef.current = window.setInterval(() => {
                  const player = playerRef.current;
                  if (!player?.getCurrentTime || !player?.getDuration) return;
                  const seconds = Math.floor(player.getCurrentTime() || 0);
                  const duration = Math.floor(player.getDuration() || video.durationSeconds || 0);
                  const percentage = duration > 0 ? Math.min(100, Math.round((seconds / duration) * 100)) : 0;
                  updateVideoProgress(video.id, seconds, percentage, percentage >= 90);
                  if (percentage >= 90) setIsCompleted(true);
                }, 10000);
              } else if (syncTimerRef.current !== null) {
                window.clearInterval(syncTimerRef.current);
                syncTimerRef.current = null;
              }
            },
          },
        });
      } catch {
        // Manual "completed" button remains available if the third-party player API is blocked.
      }
    };

    if ((window as any).YT?.Player) {
      setupPlayer();
    } else {
      const existing = document.querySelector('script[data-infoedu-youtube-api]') as HTMLScriptElement | null;
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.dataset.infoeduYoutubeApi = 'true';
        document.head.appendChild(script);
      }
      const previousReady = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === 'function') previousReady();
        setupPlayer();
      };
    }

    return () => {
      cancelled = true;
      if (syncTimerRef.current !== null) {
        window.clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      try { playerRef.current?.destroy?.(); } catch { /* noop */ }
      playerRef.current = null;
    };
  }, [video.id, video.embedType, video.durationSeconds, video.lastPositionSeconds, iframeSrc]);

  const handleDirectProgress = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const element = event.currentTarget;
    const seconds = Math.floor(element.currentTime || 0);
    const duration = Math.floor(element.duration || video.durationSeconds || 0);
    const percentage = duration > 0 ? Math.min(100, Math.round((seconds / duration) * 100)) : 0;
    updateVideoProgress(video.id, seconds, percentage, percentage >= 90);
    if (percentage >= 90) setIsCompleted(true);
  };

  const handleMarkCompleted = () => {
    setIsCompleted(true);
    updateVideoProgress(video.id, video.durationMinutes * 60, 100, true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Video Player & Description Tabs */}
      <div className="lg:col-span-2 space-y-4">
        {/* Video Player Container */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video shadow-xl border border-slate-800">
          {video.embedType === 'direct' ? (
            <video
              src={video.videoUrl}
              controls
              preload="metadata"
              className="w-full h-full"
              onLoadedMetadata={(e) => {
                if (video.lastPositionSeconds > 5) e.currentTarget.currentTime = video.lastPositionSeconds;
              }}
              onTimeUpdate={handleDirectProgress}
            />
          ) : iframeSrc ? (
            <iframe
              key={iframeSrc}
              ref={iframeRef}
              src={iframeSrc}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-slate-300">
              Video havolasi mavjud emas.
            </div>
          )}
        </div>

        {/* Video Header & Controls */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">
                {video.courseName} • {video.moduleName}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">{video.title}</h2>
            </div>

            <button
              onClick={handleMarkCompleted}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isCompleted
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isCompleted ? 'Tugallandi' : 'Videoni tugatdim'}</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span className="flex items-center gap-1 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" /> {video.teacherName}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> {video.durationMinutes} daqiqa
            </span>
            {video.watchedPercentage > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">
                {video.watchedPercentage}% ko‘rildi
              </span>
            )}
          </div>
        </div>

        {/* Tab Selector Buttons */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex border-b border-slate-100 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-3 px-4 border-b-2 transition-colors ${
                activeTab === 'description'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Dars haqida
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`pb-3 px-4 border-b-2 transition-colors ${
                activeTab === 'resources'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Resurslar ({video.resources?.length || 0})
            </button>
            {video.transcript && (
              <button
                onClick={() => setActiveTab('transcript')}
                className={`pb-3 px-4 border-b-2 transition-colors ${
                  activeTab === 'transcript'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Transkript
              </button>
            )}
          </div>

          {/* Tab Contents */}
          {activeTab === 'description' && (
            <p className="text-xs text-slate-600 leading-relaxed">{video.description}</p>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-2">
              {video.resources?.length === 0 ? (
                <p className="text-xs text-slate-400">Ushbu video uchun biriktirilgan fayllar yo‘q.</p>
              ) : (
                video.resources?.map((res) => (
                  <div
                    key={res.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{res.title}</p>
                      <p className="text-[10px] text-slate-400">{res.fileSize}</p>
                    </div>
                    <a
                      href={res.downloadUrl || '#'}
                      target={res.downloadUrl && res.downloadUrl !== '#' ? '_blank' : undefined}
                      rel="noreferrer"
                      onClick={(e) => {
                        if (!res.downloadUrl || res.downloadUrl === '#') {
                          e.preventDefault();
                          addToast('Fayl mavjud emas', `${res.title} uchun yuklab olish havolasi biriktirilmagan.`, 'warning');
                        }
                      }}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 text-blue-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'transcript' && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans">
              {video.transcript}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Module Video Playlist */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 h-fit">
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <ListVideo className="w-4 h-4 text-blue-600" />
          Modul Video Pleylist
        </h3>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {playlist.length === 0 ? (
            <p className="text-xs text-slate-400">Pleylistda boshqa videolar yo‘q.</p>
          ) : (
            playlist.map((les) => (
              <div
                key={les.id}
                onClick={() => onSelectPlaylistItem && onSelectPlaylistItem(les)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  les.id === video.lessonId
                    ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <PlayCircle className={`w-4 h-4 shrink-0 ${les.id === video.lessonId ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">{les.title}</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                  {les.durationMinutes} m
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
