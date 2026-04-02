import type { NextApiRequest } from "next";
import type { AuthContext, AuthContextResult } from "@/lib/auth/server";
import { getAuthContextByAccessToken } from "@/lib/auth/server";

export type RequestAuthOptions = {
  missingAccessTokenError?: string;
  unauthorizedError?: string;
  requireAdmin?: boolean;
  forbiddenError?: string;
};

export type RequestAuthResult = {
  context: AuthContext | null;
  accessToken: string | null;
  error: string | null;
  status: number;
};

export const getRequestAuthContext = async (
  req: NextApiRequest,
  options: RequestAuthOptions = {}
): Promise<RequestAuthResult> => {
  const {
    missingAccessTokenError = "Missing access token",
    unauthorizedError,
    requireAdmin = false,
    forbiddenError = "Forbidden",
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
  }: AuthContextResult = await getAuthContextByAccessToken(accessToken);
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
