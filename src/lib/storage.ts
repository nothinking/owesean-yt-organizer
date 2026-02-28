// Supabase 기반 저장소 (서버 사이드 전용)
import { getSupabaseAdmin } from "./supabase";
import { Channel, Category, CATEGORY_COLORS } from "@/types";
import { ResolvedChannel } from "./channel";

// ============================================
// 채널 관리
// ============================================

/**
 * 유저의 채널 목록 조회
 */
export async function getUserChannels(userEmail: string): Promise<Channel[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("channels")
    .select("channel_id, title, thumbnail_url, created_at")
    .eq("user_email", userEmail)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.channel_id,
    title: row.title,
    description: "",
    thumbnailUrl: row.thumbnail_url,
  }));
}

/**
 * 채널 추가
 */
export async function addChannel(
  userEmail: string,
  resolved: ResolvedChannel
): Promise<Channel> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("channels").upsert(
    {
      user_email: userEmail,
      channel_id: resolved.channelId,
      title: resolved.title,
      thumbnail_url: resolved.thumbnailUrl,
    },
    { onConflict: "user_email,channel_id" }
  );

  if (error) throw error;

  return {
    id: resolved.channelId,
    title: resolved.title,
    description: "",
    thumbnailUrl: resolved.thumbnailUrl,
  };
}

/**
 * 채널 삭제 (채널 배정도 함께 삭제)
 */
export async function removeChannel(
  userEmail: string,
  channelId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // 채널 배정 먼저 삭제
  await supabase
    .from("channel_assignments")
    .delete()
    .eq("user_email", userEmail)
    .eq("channel_id", channelId);

  // 채널 삭제
  const { error } = await supabase
    .from("channels")
    .delete()
    .eq("user_email", userEmail)
    .eq("channel_id", channelId);

  if (error) throw error;
}

/**
 * 유저의 모든 카테고리 + 채널 배정 정보를 조회
 */
export async function loadCategories(userEmail: string): Promise<Category[]> {
  const supabase = getSupabaseAdmin();

  const { data: cats, error: catError } = await supabase
    .from("categories")
    .select("id, name, color, sort_order")
    .eq("user_email", userEmail)
    .order("sort_order", { ascending: true });

  if (catError) throw catError;
  if (!cats || cats.length === 0) return [];

  const catIds = cats.map((c) => c.id);

  const { data: assignments, error: assignError } = await supabase
    .from("channel_assignments")
    .select("category_id, channel_id")
    .eq("user_email", userEmail)
    .in("category_id", catIds);

  if (assignError) throw assignError;

  // 카테고리별 채널 ID 매핑
  const channelMap: Record<string, string[]> = {};
  (assignments || []).forEach((a) => {
    if (!channelMap[a.category_id]) channelMap[a.category_id] = [];
    channelMap[a.category_id].push(a.channel_id);
  });

  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    channelIds: channelMap[c.id] || [],
  }));
}

/**
 * 새 카테고리 생성
 */
export async function createCategory(
  userEmail: string,
  name: string
): Promise<Category> {
  const supabase = getSupabaseAdmin();

  // 사용 중인 색상 조회
  const { data: existing } = await supabase
    .from("categories")
    .select("color, sort_order")
    .eq("user_email", userEmail);

  const usedColors = new Set((existing || []).map((c) => c.color));
  const color =
    CATEGORY_COLORS.find((c) => !usedColors.has(c)) || CATEGORY_COLORS[0];
  const maxOrder = Math.max(0, ...(existing || []).map((c) => c.sort_order));

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_email: userEmail,
      name,
      color,
      sort_order: maxOrder + 1,
    })
    .select("id, name, color")
    .single();

  if (error) throw error;

  return { id: data.id, name: data.name, color: data.color, channelIds: [] };
}

/**
 * 카테고리 삭제 (cascade로 채널 배정도 삭제됨)
 */
export async function deleteCategory(
  userEmail: string,
  categoryId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_email", userEmail);

  if (error) throw error;
}

/**
 * 카테고리 이름 변경
 */
export async function renameCategory(
  userEmail: string,
  categoryId: string,
  newName: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("categories")
    .update({ name: newName })
    .eq("id", categoryId)
    .eq("user_email", userEmail);

  if (error) throw error;
}

/**
 * 채널을 카테고리에 배정 (기존 배정은 자동 해제)
 */
export async function assignChannel(
  userEmail: string,
  categoryId: string,
  channelId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // upsert: unique(user_email, channel_id) 제약조건 활용
  const { error } = await supabase
    .from("channel_assignments")
    .upsert(
      {
        user_email: userEmail,
        category_id: categoryId,
        channel_id: channelId,
      },
      { onConflict: "user_email,channel_id" }
    );

  if (error) throw error;
}

/**
 * 채널 배정 해제
 */
export async function unassignChannel(
  userEmail: string,
  channelId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("channel_assignments")
    .delete()
    .eq("user_email", userEmail)
    .eq("channel_id", channelId);

  if (error) throw error;
}
