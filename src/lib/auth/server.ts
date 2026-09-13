import { createSupabaseServerUserClient, getSupabaseServerAnonClient } from "@/lib/supabase/server";
import type { SupabaseError } from "@/types/common";
import type { UserRole } from "@/types/user-role";
import type { SupabaseClient, User } from "@supabase/supabase-js";

// supabase-js가 JwtPayload를 재노출하지 않아 getClaims 반환 타입에서 유도한다.
type GetClaimsData = NonNullable<Awaited<ReturnType<SupabaseClient["auth"]["getClaims"]>>["data"]>;
type AuthClaims = GetClaimsData["claims"];

export type AuthIdentity = {
  supabaseServerUserClient: SupabaseClient;
  userId: string;
  authData: { user: User | null };
};

export type AuthIdentityResult = {
  identity: AuthIdentity | null;
  error: string | null;
  status: number;
};

export type AuthContext = AuthIdentity & {
  role: UserRole["role"] | null;
  isAdmin: boolean;
};

export type AuthContextResult = {
  context: AuthContext | null;
  error: string | null;
  status: number;
};

export type ResolveAuthOptions = {
  /**
   * true면 Supabase Auth 서버에 직접 조회해 세션 유효성을 확인한다.
   * 로그아웃·차단을 즉시 반영해야 하는 파괴적 작업(탈퇴·삭제) 전용이며 매 요청 왕복 1회가 든다.
   * 기본값 false는 토큰 서명을 로컬에서 검증한다.
   */
  verifyWithAuthServer?: boolean;
};

/**
 * JWT 클레임을 User 형태로 변환한다.
 * 이 프로젝트에서 authData.user를 읽는 곳은 email과 user_metadata(name·avatar_url·company_name)뿐이라
 * 클레임만으로 충분하다.
 */
const claimsToUser = (claims: AuthClaims): User =>
  ({
    id: claims.sub,
    aud: Array.isArray(claims.aud) ? (claims.aud[0] ?? "") : (claims.aud ?? ""),
    email: typeof claims.email === "string" ? claims.email : undefined,
    phone: typeof claims.phone === "string" ? claims.phone : undefined,
    role: typeof claims.role === "string" ? claims.role : undefined,
    app_metadata: claims.app_metadata ?? {},
    user_metadata: claims.user_metadata ?? {},
    created_at: "",
  }) as User;

/**
 * 토큰 서명을 로컬에서 검증한다. Supabase 네트워크 왕복 0회.
 *
 * 검증에 쓰는 공개 키(JWKS)는 auth-js가 모듈 전역에 10분간 캐시하므로
 * 요청마다 클라이언트를 새로 만들어도 캐시를 공유한다. 첫 요청 한 번만 키를 받아온다.
 */
export const resolveAuthIdentityByAccessToken = async (
  accessToken: string
): Promise<AuthIdentityResult> => {
  const supabaseServerUserClient = createSupabaseServerUserClient(accessToken);
  const verifier = getSupabaseServerAnonClient();
  if (!supabaseServerUserClient || !verifier) {
    return {
      identity: null,
      error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY",
      status: 500,
    };
  }

  const { data, error } = await verifier.auth.getClaims(accessToken);
  const claims = data?.claims;
  if (error || !claims || typeof claims.sub !== "string" || !claims.sub) {
    return {
      identity: null,
      error: error?.message ?? "Unauthorized",
      status: 401,
    };
  }

  return {
    identity: {
      supabaseServerUserClient,
      userId: claims.sub,
      authData: { user: claimsToUser(claims) },
    },
    error: null,
    status: 200,
  };
};

/**
 * Supabase Auth 서버에 직접 물어 세션을 확인한다. 왕복 1회.
 * 폐기된 토큰을 즉시 걸러내야 하는 경로에서만 쓴다.
 */
export const resolveAuthIdentityByAccessTokenStrict = async (
  accessToken: string
): Promise<AuthIdentityResult> => {
  const supabaseServerUserClient = createSupabaseServerUserClient(accessToken);
  if (!supabaseServerUserClient) {
    return {
      identity: null,
      error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY",
      status: 500,
    };
  }

  const { data: authData, error: authError } = await supabaseServerUserClient.auth.getUser();
  if (authError || !authData.user) {
    return {
      identity: null,
      error: authError?.message ?? "Unauthorized",
      status: 401,
    };
  }

  return {
    identity: {
      supabaseServerUserClient,
      userId: authData.user.id,
      authData,
    },
    error: null,
    status: 200,
  };
};

// SSR 전용 — 신원 확인에 user_roles 조회를 더한다. role이 필요 없으면 위의 identity 함수를 쓴다.
export const resolveAuthContextByAccessToken = async (
  accessToken: string,
  { verifyWithAuthServer = false }: ResolveAuthOptions = {}
): Promise<AuthContextResult> => {
  const { identity, error, status } = verifyWithAuthServer
    ? await resolveAuthIdentityByAccessTokenStrict(accessToken)
    : await resolveAuthIdentityByAccessToken(accessToken);

  if (!identity) {
    return { context: null, error, status };
  }

  const {
    data: roleData,
    error: roleError,
  }: { data: { role: UserRole["role"] } | null; error: SupabaseError } =
    await identity.supabaseServerUserClient
      .from("user_roles")
      .select("role")
      .eq("user_id", identity.userId)
      .limit(1)
      .maybeSingle();

  if (roleError) {
    return {
      context: null,
      error: roleError.message,
      status: 500,
    };
  }

  const role = roleData?.role ?? null;

  return {
    context: {
      ...identity,
      role,
      isAdmin: role === "admin",
    },
    error: null,
    status: 200,
  };
};
