import type { NextApiRequest } from "next";
import { getAuthContextByAccessToken } from "@/lib/auth/server";
import { RequestAuthOptions, RequestAuthResult } from "@/types/response";

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

  const tokenResult = getRequestAccessToken(req, { missingAccessTokenError });
  if (tokenResult.error || !tokenResult.accessToken) {
    return {
      context: null,
      accessToken: null,
      error: tokenResult.error,
      status: tokenResult.status,
    };
  }
  const { accessToken } = tokenResult;

  const {
    context,
    error: authError,
    status: authStatus,
  } = await getAuthContextByAccessToken(accessToken);
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
