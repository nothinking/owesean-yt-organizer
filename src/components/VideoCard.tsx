"use client";

import Link from "next/link";
import { Video } from "@/types";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  if (weeks < 5) return `${weeks}주 전`;
  return `${months}개월 전`;
}

interface VideoCardProps {
  video: Video;
  categoryId?: string | null;
}

export default function VideoCard({ video, categoryId }: VideoCardProps) {
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
    <Link
      href={`/watch/${video.id}?${query}`}
      className="group block rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800 transition-all hover:ring-1 hover:ring-gray-700"
    >
      <div className="relative aspect-video bg-gray-700 overflow-hidden">
        {video.thumbnailUrl && (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
          {video.title}
        </h3>
        <p className="text-xs text-gray-400 mt-1.5">{video.channelTitle}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {timeAgo(video.publishedAt)}
        </p>
      </div>
    </Link>
  );
}
