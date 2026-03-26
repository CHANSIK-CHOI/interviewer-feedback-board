import type {
  ApprovedFeedback,
  FeedbackPublicAndEmailRow,
  FeedbackPublicBase,
  FeedbackPublicRow,
  RevisedPendingPreviewFeedback,
} from "@/types/feedback";
import type { SupabaseError } from "@/types/common";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveSupabaseErrorMessage } from "@/lib/supabase/error";
import { APPROVED_PUBLIC_COLUMNS, PREVIEWCOLUMN } from "@/constants";
import { SupabaseClient } from "@supabase/supabase-js";

export const getApprovedFeedbacks = async (): Promise<ApprovedFeedback[]> => {
  const supabaseServer = getSupabaseServer();
  if (!supabaseServer) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const { data, error } = await supabaseServer
    .from("feedbacks")
    .select(APPROVED_PUBLIC_COLUMNS)
    .eq("status", "approved")
    .eq("is_public", true)
    .order("updated_at", {
      ascending: false,
    });

  if (error || !data) {
    throw new Error(resolveSupabaseErrorMessage(error, "Failed fetch getApprovedFeedbacks"));
  }

  return data.map((item) => {
    return {
      ...item,
      isPreview: false,
    };
  });
};

type FeedbackStatus = FeedbackPublicRow["status"];
export type FeedbackRowsByStatusesParams = {
  supabaseClient: SupabaseClient;
  statuses: FeedbackStatus[];
};
export const getFeedbackRowsByStatuses = async ({
  supabaseClient,
  statuses,
}: FeedbackRowsByStatusesParams): Promise<FeedbackPublicAndEmailRow[]> => {
  const { data, error }: { data: FeedbackPublicAndEmailRow[] | null; error: SupabaseError } =
    await supabaseClient
      .from("feedbacks")
      .select("*")
      .in("status", statuses)
      .order("updated_at", { ascending: false });

  if (error || !data) {
    throw new Error(resolveSupabaseErrorMessage(error, "Failed fetch getFeedbackRowsByStatuses"));
  }

  return data;
};

export const getRevisedPendingPreviewFeedbacks = async (): Promise<
  RevisedPendingPreviewFeedback[]
> => {
  const supabaseServer = getSupabaseServer();
  if (!supabaseServer) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const { data, error } = await supabaseServer
    .from("feedbacks")
    .select(PREVIEWCOLUMN)
    .eq("status", "revised_pending")
    .order("created_at", {
      ascending: false,
    });

  if (error || !data) {
    throw new Error(
      resolveSupabaseErrorMessage(error, "Failed fetch getRevisedPendingPreviewFeedbacks")
    );
  }

  return data.map((item) => {
    return {
      ...item,
      isPreview: true,
    };
  });
};

export const getFeedbackDetailById = async (
  id: FeedbackPublicBase["id"]
): Promise<FeedbackPublicRow> => {
  const supabaseServer = getSupabaseServer();
  if (!supabaseServer) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const { data, error } = await supabaseServer
    .from("feedbacks")
    .select(APPROVED_PUBLIC_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    throw new Error(resolveSupabaseErrorMessage(error, "Failed fetch getFeedbackDetailById"));
  }

  return data;
};

export const getFeedbackEmailById = async (
  id: FeedbackPublicBase["id"]
): Promise<string | null> => {
  const supabaseServer = getSupabaseServer();
  if (!supabaseServer) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const { data, error }: { data: { email: string } | null; error: SupabaseError } =
    await supabaseServer.from("feedbacks").select("email").eq("id", id).maybeSingle();
  if (error) {
    throw new Error(resolveSupabaseErrorMessage(error, "Failed fetch getFeedbackEmailById"));
  }

  return data?.email ?? null;
};
