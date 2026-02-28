"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ClipboardDetectorProps {
  onDetected: (url: string) => void;
}

const YT_URL_PATTERN =
  /https?:\/\/(www\.)?youtube\.com\/(@[\w.-]+|channel\/[\w-]+|c\/[\w.-]+|user\/[\w.-]+)/i;

export default function ClipboardDetector({
  onDetected,
}: ClipboardDetectorProps) {
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastCheckedRef = useRef<string>("");
  const dismissedUrlsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const checkClipboard = useCallback(async () => {
    // Clipboard API 지원 확인
    if (!navigator.clipboard?.readText) return;

    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();

      // 이전에 확인한 것과 같으면 스킵
      if (trimmed === lastCheckedRef.current) return;
      lastCheckedRef.current = trimmed;

      // 이미 dismiss한 URL이면 스킵
      if (dismissedUrlsRef.current.has(trimmed)) return;

      // YouTube 채널 URL 패턴 매치
      if (YT_URL_PATTERN.test(trimmed)) {
        setDetectedUrl(trimmed);
        setDismissed(false);
        setVisible(true);

        // 15초 후 자동 숨김
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setVisible(false);
        }, 15000);
      }
    } catch {
      // 클립보드 권한 없거나 거부됨 — 무시
    }
  }, []);

  useEffect(() => {
    // 앱에 포커스가 돌아올 때 체크
    const handleFocus = () => {
      checkClipboard();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkClipboard();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 초기 한 번 체크
    checkClipboard();

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [checkClipboard]);

  const handleAdd = () => {
    if (detectedUrl) {
      onDetected(detectedUrl);
      dismissedUrlsRef.current.add(detectedUrl);
      setVisible(false);
      setDetectedUrl(null);
    }
  };

  const handleDismiss = () => {
    if (detectedUrl) {
      dismissedUrlsRef.current.add(detectedUrl);
    }
    setVisible(false);
    setDismissed(true);
  };

  if (!visible || dismissed || !detectedUrl) return null;

  // URL에서 채널명 부분 추출 (표시용)
  const match = detectedUrl.match(
    /youtube\.com\/(@[\w.-]+|channel\/[\w-]+|c\/[\w.-]+|user\/[\w.-]+)/i
  );
  const channelPart = match ? match[1] : detectedUrl;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] animate-slide-up">
      <div className="flex items-center gap-3 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 shadow-2xl max-w-sm sm:max-w-md">
        {/* YouTube 아이콘 */}
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </div>

        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">채널 URL 감지됨</p>
          <p className="text-xs text-gray-400 truncate">{channelPart}</p>
        </div>

        {/* 버튼들 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-500 transition-colors"
          >
            추가
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-500 hover:text-white transition-colors"
            title="닫기"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
