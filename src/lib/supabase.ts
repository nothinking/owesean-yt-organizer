import { createClient } from "@supabase/supabase-js";

// 서버 사이드 전용 - service_role 키 사용
// API 라우트에서만 호출, 클라이언트에 노출되지 않음
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  }

  return createClient(url, serviceKey);
}
