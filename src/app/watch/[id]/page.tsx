"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Video } from "@/types";
import { useData } from "@/lib/DataContext";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";

export default function WatchPage() {
  const { data: session } = useSession();
  const params = useParams();
  const videoId = params.id as string;
  const { channels, categories, getCachedFeed, setCachedFeed } = useData();

  const [sidebarVideos, setSidebarVideos] = useState<Video[]>([]);
  const [loadingSidebar, setLoadingSidebar] = useState(false);

  const [channelId, setChannelId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [channelTitle, setChannelTitle] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  // URL에서 정보 읽기
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setChannelId(searchParams.get("ch"));
    setVideoTitle(decodeURIComponent(searchParams.get("title") || ""));
    setChannelTitle(decodeURIComponent(searchParams.get("chTitle") || ""));
    setSelectedCategoryId(searchParams.get("cat"));
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

    // 캐시 확인
    const cached = getCachedFeed(sidebarChannelIds);
    if (cached) {
      const filtered = cached.filter((v) => v.id !== videoId);
      setSidebarVideos(filtered.slice(0, 20));
      return;
    }

    setLoadingSidebar(true);
    fetch(`/api/feed?channelIds=${sidebarChannelIds.join(",")}`)
      .then((res) => res.json())
      .then((data) => {
        const allVideos = data.videos || [];
        setCachedFeed(sidebarChannelIds, allVideos);
        const filtered = allVideos.filter((v: Video) => v.id !== videoId);
        setSidebarVideos(filtered.slice(0, 20));
      })
      .catch(() => {})
      .finally(() => setLoadingSidebar(false));
  }, [sidebarChannelIds, videoId, getCachedFeed, setCachedFeed]);

  return (
    <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
      {/* Main: Player + Info */}
      <div className="flex-1 min-w-0">
        {/* YouTube Embed */}
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={videoTitle}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
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
          {currentCategory
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
            {currentCategory
              ? "같은 카테고리의 다른 영상이 없습니다."
              : "다른 영상이 없습니다."}
          </p>
        )}

        <div className="space-y-3">
          {sidebarVideos.map((video) => (
            <SidebarVideoCard
              key={video.id}
              video={video}
              categoryId={
                selectedCategoryId ? currentCategory?.id || null : null
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarVideoCard({
  video,
  categoryId,
}: {
  video: Video;
  categoryId: string | null;
}) {
  const params: Record<string, string> = {
    ch: video.channelId,
    title: video.title,
    chTitle: video.channelTitle,
  };
  if (categoryId) {
    params.cat = categoryId;
  }
  const query = new URLSearchParams(params).toString();

  return (
    <Link href={`/watch/${video.id}?${query}`} className="flex gap-3 group">
      <div className="w-40 flex-shrink-0 aspect-video bg-gray-700 rounded-lg overflow-hidden">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
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

