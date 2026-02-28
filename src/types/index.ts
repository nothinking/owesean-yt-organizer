export interface Channel {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  customUrl?: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  viewCount?: string;
  duration?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  channelIds: string[];
}

export const CATEGORY_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#6366F1", // indigo
  "#14B8A6", // teal
];
