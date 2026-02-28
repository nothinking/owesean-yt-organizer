"use client";

import { Category } from "@/types";

interface CategoryCardProps {
  category: Category;
  isSelected: boolean;
  channelCount: number;
  onClick: () => void;
}

export default function CategoryCard({
  category,
  isSelected,
  channelCount,
  onClick,
}: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
        isSelected
          ? "text-white shadow-lg scale-105"
          : "text-gray-300 bg-gray-800 hover:bg-gray-700"
      }`}
      style={
        isSelected
          ? { backgroundColor: category.color }
          : { borderLeft: `3px solid ${category.color}` }
      }
    >
      <span>{category.name}</span>
      <span
        className={`text-xs px-1.5 py-0.5 rounded-full ${
          isSelected ? "bg-white/20" : "bg-gray-700 text-gray-400"
        }`}
      >
        {channelCount}
      </span>
    </button>
  );
}
