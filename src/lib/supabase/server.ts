import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseServerAdminClient: SupabaseClient | null = null;
let supabaseServerAnonClient: SupabaseClient | null = null;

/*
함수 | 권한 수준 | 써도 되는 곳 | 피해야 하는 곳
getSupabaseBrowserClient() | 브라우저 anon client | 로그인 상태 유지, 클라이언트 세션 구독, 브라우저에서 RLS 적용 조회/쓰기 | 서버 전용 작업, service-role이 필요한 작업
getSupabaseServerAnonClient() | 서버 anon 권한 | SSR에서 비로그인 사용자 기준 공개 데이터 조회, 익명 댓글 조회 같은 read-only 처리 | 관리자 전용 데이터 조회, 비공개 데이터 조회, 권한 우회가 필요한 작업
createSupabaseServerUserClient() | 서버에서 특정 로그인 사용자 권한 | API route에서 “현재 로그인한 사용자 권한 그대로” 읽기/쓰기, RLS를 반드시 타야 하는 작업 | 관리자 시스템 작업, 전체 데이터 강제 조회
getSupabaseServerAdminClient() | service_role, 사실상 최고 권한 | 관리자 승인/삭제, 시스템성 작업, 민감 필드 조회, 대상 존재 여부 확인, RLS 우회가 필요한 서버 작업 | 일반 사용자 권한을 흉내 내야 하는 조회/쓰기, 공개/비공개 판정을 이 클라이언트에만 의존하는 작업
*/

// getSupabaseServerAdminClient : DB 권한이 매우 강하고, 사실상 RLS를 우회하는 관리자 클라이언트
export function getSupabaseServerAdminClient() {
  if (supabaseServerAdminClient) return supabaseServerAdminClient;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  supabaseServerAdminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      flowType: "pkce",
    },
  });
  return supabaseServerAdminClient;
}

// 익명 사용자처럼 동작하는 클라이언트
export function getSupabaseServerAnonClient() {
  if (supabaseServerAnonClient) return supabaseServerAnonClient;

  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  supabaseServerAnonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      flowType: "pkce",
    },
  });

  return supabaseServerAnonClient;
}

// 로그인한 실제 사용자 권한으로 동작하는 클라이언트
export function createSupabaseServerUserClient(accessToken: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const supabaseServerUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      flowType: "pkce",
    },
  });

  return supabaseServerUserClient;
}
