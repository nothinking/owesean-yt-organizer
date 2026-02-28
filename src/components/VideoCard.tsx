"use client";

import { memo } from "react";
import Link from "next/link";
import { Video } from "@/types";
import { timeAgo } from "@/lib/utils";

interface VideoCardProps {
  video: Video;
  categoryId?: string | null;
}

function VideoCard({ video, categoryId }: VideoCardProps) {
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
      className="group block rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800 active:bg-gray-750 transition-all hover:ring-1 hover:ring-gray-700"
    >
      <div className="relative aspect-video bg-gray-700 overflow-hidden">
        {video.thumbnailUrl && (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
          {video.title}
        </h3>
        <p className="text-xs text-gray-400 mt-1.5 truncate">
          {video.channelTitle}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {timeAgo(video.publishedAt)}
        </p>
      </div>
    </Link>
  );
}

export default memo(VideoCard);
