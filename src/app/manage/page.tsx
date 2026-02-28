"use client";

import { useSession } from "next-auth/react";
import { useState, useMemo } from "react";
import { useData } from "@/lib/DataContext";
import CategoryManager from "@/components/CategoryManager";
import ChannelItem from "@/components/ChannelItem";

export default function ManagePage() {
  const { data: session, status } = useSession();
  const {
    channels,
    categories,
    initialLoading,
    refreshChannels,
    refreshCategories,
  } = useData();

  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("__all__");

  // 채널 삭제
  const handleRemoveChannel = async (channelId: string) => {
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", channelId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      refreshChannels();
    } catch (err) {
      setError(err instanceof Error ? err.message : "작업에 실패했습니다.");
    }
  };

  // Category API helper
  async function categoryAction(body: Record<string, string>) {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  const handleCreateCategory = async (name: string) => {
    try {
      await categoryAction({ action: "create", name });
      refreshCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "작업에 실패했습니다.");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await categoryAction({ action: "delete", categoryId });
      refreshCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "작업에 실패했습니다.");
    }
  };

  const handleRenameCategory = async (categoryId: string, newName: string) => {
    try {
      await categoryAction({ action: "rename", categoryId, newName });
      refreshCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "작업에 실패했습니다.");
    }
  };

  const handleAssignChannel = async (
    categoryId: string,
    channelId: string
  ) => {
    try {
      await categoryAction({ action: "assign", categoryId, channelId });
      refreshCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "작업에 실패했습니다.");
    }
  };

  const handleUnassignChannel = async (channelId: string) => {
    try {
      await categoryAction({ action: "unassign", channelId });
      refreshCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "작업에 실패했습니다.");
    }
  };

  // Build channel → category map
  const channelCategoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((cat) => {
      cat.channelIds.forEach((chId) => {
        map[chId] = cat.id;
      });
    });
    return map;
  }, [categories]);

  // Filter channels
  const filteredChannels = useMemo(() => {
    let list = channels;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((ch) => ch.title.toLowerCase().includes(q));
    }

    if (filterCategory === "__uncategorized__") {
      const categorized = new Set(categories.flatMap((c) => c.channelIds));
      list = list.filter((ch) => !categorized.has(ch.id));
    } else if (filterCategory !== "__all__") {
      const cat = categories.find((c) => c.id === filterCategory);
      const ids = new Set(cat?.channelIds || []);
      list = list.filter((ch) => ids.has(ch.id));
    }

    return list;
  }, [channels, searchQuery, filterCategory, categories]);

  // Stats
  const categorizedCount = new Set(
    categories.flatMap((c) => c.channelIds)
  ).size;
  const uncategorizedCount = channels.length - categorizedCount;

  if (status === "loading" || initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-400">로그인 후 채널을 관리할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Category Management */}
      <div className="lg:col-span-1 space-y-6">
        {/* 카테고리 관리 */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            카테고리 관리
          </h2>
          <CategoryManager
            categories={categories}
            onCreateCategory={handleCreateCategory}
            onDeleteCategory={handleDeleteCategory}
            onRenameCategory={handleRenameCategory}
          />
        </div>

        {/* Stats */}
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-300">현황</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {channels.length}
              </p>
              <p className="text-xs text-gray-500">전체 채널</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {categories.length}
              </p>
              <p className="text-xs text-gray-500">카테고리</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">
                {categorizedCount}
              </p>
              <p className="text-xs text-gray-500">분류됨</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">
                {uncategorizedCount}
              </p>
              <p className="text-xs text-gray-500">미분류</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Channel List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <h2 className="text-lg font-semibold text-white">내 채널</h2>
          <div className="flex-1" />
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="채널 검색..."
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none w-full sm:w-48"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="__all__">전체 보기</option>
              <option value="__uncategorized__">미분류만</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-4 text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            {filteredChannels.length}개 채널 표시 중
          </p>
          {filteredChannels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              categories={categories}
              currentCategoryId={channelCategoryMap[channel.id]}
              onAssign={handleAssignChannel}
              onUnassign={handleUnassignChannel}
              onRemove={handleRemoveChannel}
            />
          ))}
          {filteredChannels.length === 0 && channels.length > 0 && (
            <p className="text-center py-8 text-gray-500">
              검색 결과가 없습니다.
            </p>
          )}
          {channels.length === 0 && (
            <p className="text-center py-8 text-gray-500">
              아직 추가된 채널이 없습니다. 상단의 &ldquo;채널 추가&rdquo;
              버튼으로 YouTube 채널을 추가해보세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
