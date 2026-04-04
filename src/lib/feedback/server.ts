import type {
  ApprovedFeedback,
  FeedbackPublicBase,
  FeedbackPublicRow,
  FeedbackPublicWithEmailRow,
  RevisedPendingPreviewFeedback,
} from "@/types/feedback";
import type { SupabaseError } from "@/types/common";
import { getSupabaseServerAdminClient, getSupabaseServerAnonClient } from "@/lib/supabase/server";
import { APPROVED_PUBLIC_COLUMNS, PREVIEWCOLUMN } from "@/constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countFeedbackCommentsByFeedbackIds } from "@/lib/feedback/comment";

type FeedbackReadParams = {
  supabaseClient?: SupabaseClient | null;
};

export const getApprovedFeedbacks = async ({ supabaseClient }: FeedbackReadParams = {}): Promise<
  ApprovedFeedback[]
> => {
  const supabaseServerAnonClient = getSupabaseServerAnonClient();
  const feedbackReader = supabaseClient ?? supabaseServerAnonClient;
  if (!feedbackReader) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  const { data, error } = await feedbackReader
    .from("feedbacks")
    .select(APPROVED_PUBLIC_COLUMNS)
    .eq("status", "approved")
    .eq("is_public", true)
    .order("updated_at", {
      ascending: false,
    });

  if (error || !data) {
    const errorMessage = error?.message?.trim();
    throw new Error(
      errorMessage ? `Failed fetch getApprovedFeedbacks: ${errorMessage}` : "Failed fetch getApprovedFeedbacks"
    );
  }

  const commentCounts: Record<string, number> = await countFeedbackCommentsByFeedbackIds({
    supabaseClient: feedbackReader,
    feedbackIds: data.map((item) => item.id),
  }).catch(() => ({}));

  return data.map((item) => {
    return {
      ...item,
      comment_count: commentCounts[item.id] ?? 0,
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
}: FeedbackRowsByStatusesParams): Promise<FeedbackPublicWithEmailRow[]> => {
  const { data, error }: { data: FeedbackPublicWithEmailRow[] | null; error: SupabaseError } =
    await supabaseClient
      .from("feedbacks")
      .select("*")
      .in("status", statuses)
      .order("updated_at", { ascending: false });

  if (error || !data) {
    const errorMessage = error?.message?.trim();
    throw new Error(
      errorMessage
        ? `Failed fetch getFeedbackRowsByStatuses: ${errorMessage}`
        : "Failed fetch getFeedbackRowsByStatuses"
    );
  }

  return data;
};

export const getRevisedPendingPreviewFeedbacks = async (): Promise<
  RevisedPendingPreviewFeedback[]
> => {
  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const { data, error } = await supabaseServerAdminClient
    .from("feedbacks")
    .select(PREVIEWCOLUMN)
    .eq("status", "revised_pending")
    .order("created_at", {
      ascending: false,
    });

  if (error || !data) {
    const errorMessage = error?.message?.trim();
    throw new Error(
      errorMessage
        ? `Failed fetch getRevisedPendingPreviewFeedbacks: ${errorMessage}`
        : "Failed fetch getRevisedPendingPreviewFeedbacks"
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
  id: FeedbackPublicBase["id"],
  { supabaseClient }: FeedbackReadParams = {}
): Promise<FeedbackPublicRow | null> => {
  const supabaseServerAnonClient = getSupabaseServerAnonClient();
  const feedbackReader = supabaseClient ?? supabaseServerAnonClient;
  if (!feedbackReader) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  const { data, error } = await feedbackReader
    .from("feedbacks")
    .select(APPROVED_PUBLIC_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    const errorMessage = error.message?.trim();
    throw new Error(
      errorMessage ? `Failed fetch getFeedbackDetailById: ${errorMessage}` : "Failed fetch getFeedbackDetailById"
    );
  }

  return data ?? null;
};

export const getFeedbackEmailById = async (
  id: FeedbackPublicBase["id"]
): Promise<string | null> => {
  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const { data, error }: { data: { email: string } | null; error: SupabaseError } =
    await supabaseServerAdminClient.from("feedbacks").select("email").eq("id", id).maybeSingle();
  if (error) {
    const errorMessage = error.message?.trim();
    throw new Error(
      errorMessage ? `Failed fetch getFeedbackEmailById: ${errorMessage}` : "Failed fetch getFeedbackEmailById"
    );
  }

  return data?.email ?? null;
};
