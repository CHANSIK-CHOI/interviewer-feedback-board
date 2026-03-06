import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { UserRole } from "./user-role";
import type { ApiResponse } from "./common";
import type { FeedbackPublicRow, RevisedPendingOwnerFeedback } from "./feedback";

export type AuthContext = {
  supabaseServer: SupabaseClient;
  userId: string;
  role: UserRole["role"] | null;
  isAdmin: boolean;
  authData: { user: User | null };
};

export type AuthContextResult = {
  context: AuthContext | null;
  error: string | null;
  status: number;
};

export type UpdateFeedbackResponse = {
  data: { id: string } | null;
  error: string | null;
};

export type PendingCountResponse = ApiResponse<{
  count: number;
}>;

export type FeedbackMineResponse = ApiResponse<RevisedPendingOwnerFeedback[]>;

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

export type ParseStatusQueryResult<T extends string> = {
  statuses: T[] | null;
  error: string | null;
};

export type FeedbackResponse<T> = ApiResponse<T>;

export type CreateFeedbackResponse = {
  data: { id: string } | null;
  error: string | null;
};

type FeedbackStatus = FeedbackPublicRow["status"];
export type FeedbackRowsByStatusesParams = {
  supabaseClient: SupabaseClient;
  statuses: FeedbackStatus[];
};

export type SessionCookieSyncResponse = ApiResponse<null>;

export type WithdrawResponse = ApiResponse<{
  success: true;
}>;
