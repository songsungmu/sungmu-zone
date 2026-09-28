import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * get_change_impact 전용 읽기 클라이언트. 이 서버의 다른 도구들과 달리
 * Google Sheet가 아니라 Next.js 앱(Phase 10)이 분석마다 적재하는
 * Supabase trace_links/requirements/policies/exceptions 테이블을 읽는다.
 * 이 서버는 여전히 어떤 테이블에도 쓰지 않는다 — 읽기 전용이다.
 */

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedClient = createClient(url, key);
  return cachedClient;
}
