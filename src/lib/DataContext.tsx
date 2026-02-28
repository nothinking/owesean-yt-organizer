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
  key: string; // channelIds joined
  videos: Video[];
  timestamp: number;
}

interface DataContextType {
  channels: Channel[];
  categories: Category[];
  initialLoading: boolean;
  refreshChannels: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshAll: () => Promise<void>;
  // 피드 캐시
  getCachedFeed: (channelIds: string[]) => Video[] | null;
  setCachedFeed: (channelIds: string[], videos: Video[]) => void;
}

const DataContext = createContext<DataContextType | null>(null);

const FEED_CACHE_TTL = 5 * 60 * 1000; // 5분

export function DataProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const loaded = useRef(false);
  const feedCacheRef = useRef<FeedCache[]>([]);

  const refreshChannels = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/channels");
      const data = await res.json();
      if (!data.error) setChannels(data.channels || []);
    } catch {}
  }, [session]);

  const refreshCategories = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (!data.error) setCategories(data.categories || []);
    } catch {}
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
      if (!chData.error) setChannels(chData.channels || []);
      if (!catData.error) setCategories(catData.categories || []);
    } catch {}
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
  const getCachedFeed = useCallback((channelIds: string[]): Video[] | null => {
    const key = channelIds.sort().join(",");
    const cached = feedCacheRef.current.find((c) => c.key === key);
    if (cached && Date.now() - cached.timestamp < FEED_CACHE_TTL) {
      return cached.videos;
    }
    return null;
  }, []);

  const setCachedFeed = useCallback(
    (channelIds: string[], videos: Video[]) => {
      const key = channelIds.sort().join(",");
      const existing = feedCacheRef.current.findIndex((c) => c.key === key);
      const entry: FeedCache = { key, videos, timestamp: Date.now() };
      if (existing >= 0) {
        feedCacheRef.current[existing] = entry;
      } else {
        feedCacheRef.current.push(entry);
        // 최대 20개 캐시
        if (feedCacheRef.current.length > 20) {
          feedCacheRef.current.shift();
        }
      }
    },
    []
  );

  return (
    <DataContext.Provider
      value={{
        channels,
        categories,
        initialLoading,
        refreshChannels,
        refreshCategories,
        refreshAll,
        getCachedFeed,
        setCachedFeed,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
