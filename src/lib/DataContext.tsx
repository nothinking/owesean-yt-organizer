"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { Channel, Video, Category } from "@/types";

interface FeedCache {
  key: string;
  videos: Video[];
  timestamp: number;
}

interface DataContextType {
  channels: Channel[];
  categories: Category[];
  initialLoading: boolean;
  error: string | null;
  refreshChannels: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshAll: () => Promise<void>;
  invalidateFeedCache: () => void;
  getCachedFeed: (channelIds: string[]) => Video[] | null;
  setCachedFeed: (channelIds: string[], videos: Video[]) => void;
}

const DataContext = createContext<DataContextType | null>(null);

const FEED_CACHE_TTL = 5 * 60 * 1000; // 5분
const MAX_CACHE_ENTRIES = 20;

export function DataProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);
  const feedCacheRef = useRef<FeedCache[]>([]);

  const refreshChannels = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/channels");
      const data = await res.json();
      if (data.error) {
        console.error("Failed to refresh channels:", data.error);
        return;
      }
      setChannels(data.channels || []);
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    }
  }, [session]);

  const refreshCategories = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.error) {
        console.error("Failed to refresh categories:", data.error);
        return;
      }
      setCategories(data.categories || []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, [session]);

  const refreshAll = useCallback(async () => {
    if (!session) return;
    try {
      const [chRes, catRes] = await Promise.all([
        fetch("/api/channels"),
        fetch("/api/categories"),
      ]);
      const [chData, catData] = await Promise.all([
        chRes.json(),
        catRes.json(),
      ]);
      if (chData.error) console.error("Channels error:", chData.error);
      else setChannels(chData.channels || []);
      if (catData.error) console.error("Categories error:", catData.error);
      else setCategories(catData.categories || []);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "데이터를 불러올 수 없습니다.";
      console.error("Failed to fetch data:", err);
      setError(message);
    }
  }, [session]);

  // 최초 1회 로드
  useEffect(() => {
    if (!session || loaded.current) {
      if (!session) setInitialLoading(false);
      return;
    }
    loaded.current = true;
    setInitialLoading(true);
    refreshAll().finally(() => setInitialLoading(false));
  }, [session, refreshAll]);

  // 피드 캐시 관리
  const getCachedFeed = useCallback(
    (channelIds: string[]): Video[] | null => {
      const key = [...channelIds].sort().join(",");
      const cached = feedCacheRef.current.find((c) => c.key === key);
      if (cached && Date.now() - cached.timestamp < FEED_CACHE_TTL) {
        return cached.videos;
      }
      return null;
    },
    []
  );

  const setCachedFeed = useCallback(
    (channelIds: string[], videos: Video[]) => {
      const key = [...channelIds].sort().join(",");
      const existing = feedCacheRef.current.findIndex((c) => c.key === key);
      const entry: FeedCache = { key, videos, timestamp: Date.now() };
      if (existing >= 0) {
        feedCacheRef.current[existing] = entry;
      } else {
        if (feedCacheRef.current.length >= MAX_CACHE_ENTRIES) {
          feedCacheRef.current.shift();
        }
        feedCacheRef.current.push(entry);
      }
    },
    []
  );

  const invalidateFeedCache = useCallback(() => {
    feedCacheRef.current = [];
  }, []);

  return (
    <DataContext.Provider
      value={{
        channels,
        categories,
        initialLoading,
        error,
        refreshChannels,
        refreshCategories,
        refreshAll,
        invalidateFeedCache,
        getCachedFeed,
        setCachedFeed,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
