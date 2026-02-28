"use client";

import { Channel, Category } from "@/types";

interface ChannelItemProps {
  channel: Channel;
  categories: Category[];
  currentCategoryId?: string;
  onAssign: (categoryId: string, channelId: string) => void;
  onUnassign: (channelId: string) => void;
  onRemove?: (channelId: string) => void;
}

export default function ChannelItem({
  channel,
  categories,
  currentCategoryId,
  onAssign,
  onUnassign,
  onRemove,
}: ChannelItemProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group">
      <a
        href={`https://www.youtube.com/channel/${channel.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0"
      >
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-gray-400 text-sm sm:text-lg font-bold overflow-hidden">
          {channel.thumbnailUrl ? (
            <img
              src={channel.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            channel.title.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-white truncate hover:text-blue-400 transition-colors">
            {channel.title}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500 truncate hidden sm:block">
            {channel.id}
          </p>
        </div>
      </a>
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <select
          value={currentCategoryId || ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              onAssign(val, channel.id);
            } else {
              onUnassign(channel.id);
            }
          }}
          className="text-xs bg-gray-700 text-gray-300 rounded-md px-1.5 sm:px-2 py-1.5 border border-gray-600 focus:border-blue-500 focus:outline-none cursor-pointer max-w-[100px] sm:max-w-none"
        >
          <option value="">미분류</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {onRemove && (
          <button
            onClick={() => {
              if (confirm(`"${channel.title}" 채널을 삭제하시겠습니까?`)) {
                onRemove(channel.id);
              }
            }}
            className="p-2 text-gray-500 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
            title="채널 삭제"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
