import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseServer: SupabaseClient | null = null;

// 관리자 작업용(매우 제한적으로)
export function getSupabaseServer() {
  if (supabaseServer) return supabaseServer;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // Use PKCE so OAuth returns with ?code= instead of #access_token
      flowType: "pkce",
    },
  });
  return supabaseServer;
}

// user access token + anon key 조합으로 RLS를 강제하는 서버용 클라이언트 = 사용자 권한/RLS 강제용
export function getSupabaseServerByAccessToken(accessToken: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
}
