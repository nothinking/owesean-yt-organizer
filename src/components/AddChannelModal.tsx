"use client";

import { useState, useEffect } from "react";
import { Category, CATEGORY_COLORS } from "@/types";

interface AddChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

export default function AddChannelModal({
  isOpen,
  onClose,
  onAdded,
}: AddChannelModalProps) {
  const [channelUrl, setChannelUrl] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 새 카테고리 인라인 생성
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // 모달 열릴 때 카테고리 로드
  useEffect(() => {
    if (!isOpen) return;
    setChannelUrl("");
    setSelectedCategoryId("");
    setError(null);
    setSuccess(null);
    setShowNewCategory(false);
    setNewCategoryName("");

    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, [isOpen]);

  const handleAdd = async () => {
    if (!channelUrl.trim()) return;
    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. 채널 추가
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", url: channelUrl.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const channelId = data.channel?.id;

      // 2. 카테고리 배정 (선택된 경우)
      if (selectedCategoryId && channelId) {
        await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign",
            categoryId: selectedCategoryId,
            channelId,
          }),
        });
      }

      setSuccess(`"${data.channel?.title || "채널"}" 추가됨!`);
      setChannelUrl("");
      setSelectedCategoryId("");
      onAdded?.();

      // 잠시 후 모달 닫기
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // 카테고리 목록 새로고침
      const catRes = await fetch("/api/categories");
      const catData = await catRes.json();
      const newCategories = catData.categories || [];
      setCategories(newCategories);

      // 새로 만든 카테고리 자동 선택
      const created = newCategories.find(
        (c: Category) => c.name === newCategoryName.trim()
      );
      if (created) setSelectedCategoryId(created.id);

      setNewCategoryName("");
      setShowNewCategory(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingCategory(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">채널 추가</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* URL 입력 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              YouTube 채널 URL
            </label>
            <input
              type="text"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !adding && handleAdd()}
              placeholder="https://www.youtube.com/@channelname"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
              disabled={adding}
              autoFocus
            />
          </div>

          {/* 카테고리 선택 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              카테고리 (선택사항)
            </label>
            <div className="flex flex-wrap gap-2">
              {/* 없음 버튼 */}
              <button
                onClick={() => setSelectedCategoryId("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedCategoryId === ""
                    ? "bg-gray-600 text-white ring-2 ring-gray-400"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                없음
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedCategoryId === cat.id
                      ? "ring-2 ring-white/50 text-white"
                      : "text-gray-300 hover:text-white"
                  }`}
                  style={{
                    backgroundColor:
                      selectedCategoryId === cat.id
                        ? cat.color
                        : `${cat.color}30`,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </button>
              ))}

              {/* 새 카테고리 만들기 버튼 */}
              {!showNewCategory && (
                <button
                  onClick={() => setShowNewCategory(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all border border-dashed border-gray-600"
                >
                  + 새 카테고리
                </button>
              )}
            </div>

            {/* 새 카테고리 인라인 입력 */}
            {showNewCategory && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleCreateCategory()
                  }
                  placeholder="카테고리 이름..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  autoFocus
                  disabled={creatingCategory}
                />
                <button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || creatingCategory}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-500 disabled:opacity-40 transition-colors"
                >
                  {creatingCategory ? "..." : "생성"}
                </button>
                <button
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryName("");
                  }}
                  className="px-2 py-1.5 text-gray-500 hover:text-white text-xs transition-colors"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 에러/성공 메시지 */}
        {error && (
          <div className="mt-4 bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 bg-green-900/30 border border-green-800 text-green-300 rounded-lg p-3 text-sm">
            {success}
          </div>
        )}

        {/* 추가 버튼 */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleAdd}
            disabled={!channelUrl.trim() || adding}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {adding ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                추가 중...
              </span>
            ) : (
              "채널 추가"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
