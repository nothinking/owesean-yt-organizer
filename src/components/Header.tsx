"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useData } from "@/lib/DataContext";
import AuthButton from "./AuthButton";
import AddChannelModal from "./AddChannelModal";

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { refreshAll, invalidateFeedCache } = useData();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleChannelAdded = () => {
    invalidateFeedCache();
    refreshAll();
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-red-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span className="text-base sm:text-lg font-bold text-white hidden xs:inline">
                YT Organizer
              </span>
            </Link>

            <nav className="flex gap-1">
              <Link
                href="/"
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  pathname === "/"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                피드
              </Link>
              <Link
                href="/manage"
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  pathname === "/manage"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                관리
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {session && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-500 active:bg-red-700 transition-colors"
                title="채널 추가"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="hidden sm:inline">채널 추가</span>
              </button>
            )}
            <AuthButton />
          </div>
        </div>
      </header>

      <AddChannelModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={handleChannelAdded}
      />
    </>
  );
}
