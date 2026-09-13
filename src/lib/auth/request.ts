import type { NextApiRequest } from "next";
import type { AuthContext, AuthContextResult } from "@/lib/auth/server";
import { resolveAuthContextByAccessToken } from "@/lib/auth/server";

export type ApiRequestAuthOptions = {
  missingAccessTokenError?: string;
  unauthorizedError?: string;
  requireAdmin?: boolean;
  forbiddenError?: string;
  /**
   * 세션 유효성을 Supabase Auth 서버에 직접 확인한다. 매 요청 왕복 1회가 추가된다.
   * 되돌릴 수 없는 작업(탈퇴·삭제)에서만 켠다. 그 외에는 토큰 서명을 로컬 검증한다.
   */
  verifyWithAuthServer?: boolean;
};

export type ApiRequestAuthResult = {
  context: AuthContext | null;
  accessToken: string | null;
  error: string | null;
  status: number;
};

export const resolveApiRequestAuth = async (
  req: NextApiRequest,
  options: ApiRequestAuthOptions = {}
): Promise<ApiRequestAuthResult> => {
  const {
    missingAccessTokenError = "Missing access token",
    unauthorizedError,
    requireAdmin = false,
    forbiddenError = "Forbidden",
    verifyWithAuthServer = false,
  } = options;
  const authHeader = req.headers.authorization;
  const accessToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!accessToken) {
    return {
      context: null,
      accessToken: null,
      error: missingAccessTokenError,
      status: 401,
    };
  }

  const {
    context,
    error: authError,
    status: authStatus,
  }: AuthContextResult = await resolveAuthContextByAccessToken(accessToken, {
    verifyWithAuthServer,
  });
  if (authError || !context) {
    return {
      context: null,
      accessToken: null,
      error: unauthorizedError ?? authError ?? "Unauthorized",
      status: authStatus,
    };
  }

  if (requireAdmin && !context.isAdmin) {
    return {
      context: null,
      accessToken: null,
      error: forbiddenError,
      status: 403,
    };
  }

  return {
    context,
    accessToken,
    error: null,
    status: 200,
  };
};
