import type { NextApiRequest } from "next";
import { AuthContext, AuthContextResult, getAuthContextByAccessToken } from "@/lib/auth/server";

type RequestAccessTokenOptions = {
  missingAccessTokenError?: string;
};

export type RequestAccessTokenResult = {
  accessToken: string | null;
  error: string | null;
  status: number;
};

export const getRequestAccessToken = (
  req: NextApiRequest,
  options: RequestAccessTokenOptions = {}
): RequestAccessTokenResult => {
  const { missingAccessTokenError = "Missing access token" } = options;

  const authHeader = req.headers.authorization;
  const accessToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!accessToken) {
    return {
      accessToken: null,
      error: missingAccessTokenError,
      status: 401,
    };
  }

  return {
    accessToken,
    error: null,
    status: 200,
  };
};

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

  const {
    accessToken,
    error: tokenError,
    status: tokenStatus,
  }: RequestAccessTokenResult = getRequestAccessToken(req, {
    missingAccessTokenError,
  } satisfies RequestAccessTokenOptions);
  if (tokenError || !accessToken) {
    return {
      context: null,
      accessToken: null,
      error: tokenError,
      status: tokenStatus,
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
