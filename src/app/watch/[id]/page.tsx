"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Video } from "@/types";
import { useData } from "@/lib/DataContext";
import { timeAgo, formatDuration } from "@/lib/utils";
import Link from "next/link";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

declare namespace YT {
  class Player {
    constructor(
      elementId: string | HTMLElement,
      options: {
        videoId?: string;
        playerVars?: Record<string, number | string>;
        events?: {
          onReady?: (event: { target: Player }) => void;
          onStateChange?: (event: { data: number }) => void;
        };
      }
    );
    destroy(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    playVideo(): void;
  }
  enum PlayerState {
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }
}

export default function WatchPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  const { channels, categories, getCachedFeed, setCachedFeed } = useData();

  const [sidebarVideos, setSidebarVideos] = useState<Video[]>([]);
  const [orderedVideos, setOrderedVideos] = useState<Video[]>([]); // 전체 순서 (현재 영상 포함)
  const [loadingSidebar, setLoadingSidebar] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});

  // 반복 재생 상태
  const [loopEnabled, setLoopEnabled] = useState(false);

  // 연속 재생 상태
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [channelId, setChannelId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [channelTitle, setChannelTitle] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [channelFilterId, setChannelFilterId] = useState<string | null>(null);

  // URL에서 정보 읽기
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setChannelId(searchParams.get("ch"));
    setVideoTitle(decodeURIComponent(searchParams.get("title") || ""));
    setChannelTitle(decodeURIComponent(searchParams.get("chTitle") || ""));
    setSelectedCategoryId(searchParams.get("cat"));
    setChannelFilterId(searchParams.get("chFilter"));
  }, [videoId]);

  // 표시할 카테고리 결정
  const currentCategory = useMemo(() => {
    if (selectedCategoryId) {
      return categories.find((cat) => cat.id === selectedCategoryId) || null;
    }
    return null;
  }, [categories, selectedCategoryId]);

  // 사이드바에 표시할 채널 ID 목록
  const sidebarChannelIds = useMemo(() => {
    if (!selectedCategoryId) {
      return channels.map((ch) => ch.id);
    }
    if (currentCategory) {
      return currentCategory.channelIds;
    }
    return [];
  }, [selectedCategoryId, currentCategory, channels]);

  // 사이드바 영상 로드 (캐시 활용)
  useEffect(() => {
    if (sidebarChannelIds.length === 0) {
      setSidebarVideos([]);
      return;
    }

    const fetchDurations = (vids: Video[]) => {
      const ids = vids.map((v) => v.id).join(",");
      if (!ids) return;
      fetch(`/api/durations?ids=${ids}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.durations) setDurations((prev) => ({ ...prev, ...d.durations }));
        })
        .catch(() => {});
    };

    const processVideos = (vids: Video[]) => {
      let filtered = vids;
      if (channelFilterId) {
        filtered = filtered.filter((v) => v.channelId === channelFilterId);
      }
      const ordered = filtered.slice(0, 20);
      setOrderedVideos(ordered);
      setSidebarVideos(ordered);
      fetchDurations(ordered);
    };

    // 캐시 확인
    const cached = getCachedFeed(sidebarChannelIds);
    if (cached) {
      processVideos(cached);
      return;
    }

    setLoadingSidebar(true);
    fetch(`/api/feed?channelIds=${sidebarChannelIds.join(",")}`)
      .then((res) => res.json())
      .then((data) => {
        const allVideos = data.videos || [];
        setCachedFeed(sidebarChannelIds, allVideos);
        processVideos(allVideos);
      })
      .catch(() => {})
      .finally(() => setLoadingSidebar(false));
  }, [sidebarChannelIds, videoId, channelFilterId, getCachedFeed, setCachedFeed]);

  // 다음 영상: 전체 순서에서 현재 영상 다음 위치
  const nextVideo = useMemo(() => {
    const idx = orderedVideos.findIndex((v) => v.id === videoId);
    if (idx === -1 || idx + 1 >= orderedVideos.length) return null;
    return orderedVideos[idx + 1];
  }, [orderedVideos, videoId]);
  const getNextVideoUrl = useCallback(() => {
    if (!nextVideo) return null;
    const p: Record<string, string> = {
      ch: nextVideo.channelId,
      title: nextVideo.title,
      chTitle: nextVideo.channelTitle,
    };
    if (selectedCategoryId) p.cat = selectedCategoryId;
    if (channelFilterId) p.chFilter = channelFilterId;
    return `/watch/${nextVideo.id}?${new URLSearchParams(p).toString()}`;
  }, [nextVideo, selectedCategoryId, channelFilterId]);

  // 카운트다운 취소
  const cancelCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
  }, []);

  // 카운트다운 시작
  const startCountdown = useCallback(() => {
    const url = getNextVideoUrl();
    if (!url) return;
    cancelCountdown();
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          router.push(url);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [getNextVideoUrl, cancelCountdown, router]);

  // onStateChange에서 최신 값 참조를 위한 ref
  const loopRef = useRef(loopEnabled);
  useEffect(() => {
    loopRef.current = loopEnabled;
  }, [loopEnabled]);

  const autoplayRef = useRef(autoplayEnabled);
  useEffect(() => {
    autoplayRef.current = autoplayEnabled;
  }, [autoplayEnabled]);

  const startCountdownRef = useRef(startCountdown);
  useEffect(() => {
    startCountdownRef.current = startCountdown;
  }, [startCountdown]);

  const nextVideoRef = useRef(nextVideo);
  useEffect(() => {
    nextVideoRef.current = nextVideo;
  }, [nextVideo]);

  // YouTube IFrame API 로드 및 플레이어 생성
  useEffect(() => {
    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      playerRef.current = new window.YT.Player("yt-player", {
        videoId,
        playerVars: { autoplay: 1, rel: 0 },
        events: {
          onStateChange: (event: { data: number }) => {
            if (event.data === 0) {
              if (loopRef.current && playerRef.current) {
                playerRef.current.seekTo(0, true);
                playerRef.current.playVideo();
              } else if (autoplayRef.current && nextVideoRef.current) {
                startCountdownRef.current();
              }
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // autoplayEnabled가 꺼지면 진행 중인 카운트다운 취소
  useEffect(() => {
    if (!autoplayEnabled) cancelCountdown();
  }, [autoplayEnabled, cancelCountdown]);

  // videoId 변경 시 카운트다운 초기화
  useEffect(() => {
    cancelCountdown();
  }, [videoId, cancelCountdown]);

  return (
    <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
      {/* Main: Player + Info */}
      <div className="flex-1 min-w-0">
        {/* YouTube Player (IFrame API) */}
        <div
          ref={playerContainerRef}
          className="relative w-full aspect-video bg-black rounded-xl overflow-hidden"
        >
          <div id="yt-player" className="absolute inset-0 w-full h-full" />

          {/* 카운트다운 오버레이 */}
          {countdown !== null && nextVideo && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 gap-3">
              <p className="text-gray-400 text-sm">다음 영상</p>
              <p className="text-white text-lg font-semibold text-center px-4 line-clamp-2">
                {nextVideo.title}
              </p>
              <div className="text-5xl font-bold text-white mt-2">
                {countdown}
              </div>
              <button
                onClick={cancelCountdown}
                className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
              >
                취소
              </button>
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="mt-4 space-y-3">
          <h1 className="text-xl font-semibold text-white leading-tight">
            {videoTitle || "영상 제목"}
          </h1>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {channelId && (
                <a
                  href={`https://www.youtube.com/channel/${channelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-300 hover:text-white transition-colors font-medium"
                >
                  {channelTitle || channelId}
                </a>
              )}
              {currentCategory && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: currentCategory.color }}
                >
                  {currentCategory.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* 반복 재생 버튼 */}
              <button
                onClick={() => setLoopEnabled((v) => !v)}
                className={`p-1.5 rounded-lg transition-colors ${
                  loopEnabled
                    ? "text-blue-400 bg-blue-400/10"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                title={loopEnabled ? "반복 재생 끄기" : "반복 재생 켜기"}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 12V9a4 4 0 0 1 4-4h8l-3-3m3 3-3 3M20 12v3a4 4 0 0 1-4 4H8l3 3m-3-3 3-3"
                  />
                </svg>
              </button>

              {/* 연속 재생 토글 */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-sm text-gray-400">연속 재생</span>
                <button
                  role="switch"
                  aria-checked={autoplayEnabled}
                  onClick={() => setAutoplayEnabled((v) => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    autoplayEnabled ? "bg-blue-500" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      autoplayEnabled ? "translate-x-4" : ""
                    }`}
                  />
                </button>
              </label>

              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                YouTube에서 보기 →
              </a>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← 피드로 돌아가기
          </Link>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-72 lg:w-80 xl:w-96 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          {channelFilterId
            ? `${channelTitle || "채널"}의 다른 영상`
            : currentCategory
              ? `${currentCategory.name} 카테고리의 다른 영상`
              : "전체 채널의 다른 영상"}
        </h2>

        {loadingSidebar && (
          <div className="text-center py-8 text-gray-500">
            <div className="inline-block w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin mb-2" />
            <p className="text-xs">불러오는 중...</p>
          </div>
        )}

        {!loadingSidebar && sidebarVideos.length === 0 && (
          <p className="text-xs text-gray-500 py-4">
            {channelFilterId
              ? "같은 채널의 다른 영상이 없습니다."
              : currentCategory
                ? "같은 카테고리의 다른 영상이 없습니다."
                : "다른 영상이 없습니다."}
          </p>
        )}

        <div className="space-y-3">
          {sidebarVideos.map((video) => (
            <SidebarVideoCard
              key={video.id}
              video={video}
              isActive={video.id === videoId}
              categoryId={
                selectedCategoryId ? currentCategory?.id || null : null
              }
              channelFilterId={channelFilterId}
              duration={durations[video.id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarVideoCard({
  video,
  isActive,
  categoryId,
  channelFilterId,
  duration,
}: {
  video: Video;
  isActive?: boolean;
  categoryId: string | null;
  channelFilterId?: string | null;
  duration?: number;
}) {
  const params: Record<string, string> = {
    ch: video.channelId,
    title: video.title,
    chTitle: video.channelTitle,
  };
  if (categoryId) {
    params.cat = categoryId;
  }
  if (channelFilterId) {
    params.chFilter = channelFilterId;
  }
  const query = new URLSearchParams(params).toString();

  return (
    <Link
      href={`/watch/${video.id}?${query}`}
      className={`flex gap-3 group rounded-lg p-1.5 -m-1.5 transition-colors ${
        isActive ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      <div className="w-40 flex-shrink-0 aspect-video bg-gray-700 rounded-lg overflow-hidden relative">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {duration != null && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded font-medium">
            {formatDuration(duration)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm line-clamp-2 leading-snug transition-colors ${
          isActive ? "text-blue-400 font-medium" : "text-white group-hover:text-blue-400"
        }`}>
          {video.title}
        </p>
        <p className="text-xs text-gray-500 mt-1">{video.channelTitle}</p>
        <p className="text-xs text-gray-600 mt-0.5">
          {timeAgo(video.publishedAt)}
        </p>
      </div>
    </Link>
  );
}

