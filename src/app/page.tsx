"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Channel, Video, Category } from "@/types";
import CategoryCard from "@/components/CategoryCard";
import VideoCard from "@/components/VideoCard";

export default function FeedPage() {
  const { data: session, status } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [videos, setVideos] = useState<Video[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataLoaded = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load channels + categories together (한번에)
  useEffect(() => {
    if (!session) return;
    setInitialLoading(true);
    Promise.all([
      fetch("/api/channels").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([chData, catData]) => {
        if (chData.error) throw new Error(chData.error);
        if (catData.error) throw new Error(catData.error);
        setChannels(chData.channels || []);
        setCategories(catData.categories || []);
        dataLoaded.current = true;
      })
      .catch((err) => setError(err.message))
      .finally(() => setInitialLoading(false));
  }, [session]);

  // Refresh categories when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && session) {
        fetch("/api/categories")
          .then((r) => r.json())
          .then((data) => {
            if (!data.error) setCategories(data.categories || []);
          });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [session]);

  // Get uncategorized channel IDs
  const getUncategorizedIds = useCallback((): string[] => {
    const categorized = new Set(categories.flatMap((c) => c.channelIds));
    return channels.map((c) => c.id).filter((id) => !categorized.has(id));
  }, [categories, channels]);

  // Get channel IDs for selected category
  const getSelectedChannelIds = useCallback((): string[] => {
    if (!selectedCategoryId) {
      return channels.map((c) => c.id);
    }
    if (selectedCategoryId === "__uncategorized__") {
      return getUncategorizedIds();
    }
    const cat = categories.find((c) => c.id === selectedCategoryId);
    return cat?.channelIds || [];
  }, [selectedCategoryId, categories, channels, getUncategorizedIds]);

  // Load videos via RSS feed
  useEffect(() => {
    if (!session || !dataLoaded.current) return;

    const channelIds = getSelectedChannelIds();
    if (channelIds.length === 0) {
      setVideos([]);
      return;
    }

    // 이전 요청 취소
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadingVideos(true);
    setError(null);

    fetch(`/api/feed?channelIds=${channelIds.join(",")}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setVideos(data.videos || []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoadingVideos(false));
  }, [session, getSelectedChannelIds]);

  const uncategorizedIds = getUncategorizedIds();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-3">YT Organizer</h1>
          <p className="text-gray-400 text-lg mb-1">
            유튜브 구독 채널을 카테고리별로 정리하세요
          </p>
          <p className="text-gray-500 text-sm">
            Google 로그인 후 채널을 추가하고 카테고리로 관리하세요
          </p>
        </div>
      </div>
    );
  }

  // 초기 로딩 (채널+카테고리 불러오기)
  if (initialLoading) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="inline-block w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin mb-3" />
        <p>채널 목록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategoryId(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            selectedCategoryId === null
              ? "bg-white text-gray-900 shadow-lg"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          전체
          <span className="ml-1.5 text-xs opacity-60">{channels.length}</span>
        </button>

        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            isSelected={selectedCategoryId === cat.id}
            channelCount={cat.channelIds.length}
            onClick={() => setSelectedCategoryId(cat.id)}
          />
        ))}

        {uncategorizedIds.length > 0 && (
          <button
            onClick={() => setSelectedCategoryId("__uncategorized__")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategoryId === "__uncategorized__"
                ? "bg-gray-600 text-white shadow-lg"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            미분류
            <span className="ml-1.5 text-xs opacity-60">
              {uncategorizedIds.length}
            </span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {/* 영상 그리드: 로딩 중에도 기존 영상 유지, 위에 로딩 인디케이터만 표시 */}
      {loadingVideos && videos.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin mb-3" />
          <p>최신 영상을 불러오는 중...</p>
        </div>
      )}

      {videos.length > 0 && (
        <div className="relative">
          {/* 카테고리 전환 시 로딩 오버레이 */}
          {loadingVideos && (
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
              <div className="inline-block w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                categoryId={selectedCategoryId}
              />
            ))}
          </div>
        </div>
      )}

      {!loadingVideos && videos.length === 0 && channels.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">아직 추가된 채널이 없습니다</p>
          <p className="text-sm">
            &ldquo;채널 관리&rdquo; 탭에서 YouTube 채널 URL을 붙여넣어
            추가해보세요.
          </p>
        </div>
      )}

      {!loadingVideos &&
        videos.length === 0 &&
        channels.length > 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>이 카테고리에 영상이 없습니다.</p>
          </div>
        )}
    </div>
  );
}
