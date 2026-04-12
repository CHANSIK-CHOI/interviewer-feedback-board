import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import type { SupabaseError } from "@/types/common";
import type { FeedbackPublicRow } from "@/types/feedback";
import type { FeedbackCommentRow } from "@/types/feedback-comment";
import type { NotificationItemData, NotificationRow, NotificationType } from "@/types/notification";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildNotificationContent } from "./content";

export const NOTIFICATION_SELECT_COLUMNS = "id, type, title, body, link, is_read, created_at";

type ListNotificationsParams = {
  supabaseClient: SupabaseClient;
  userId: NotificationRow["recipient_user_id"];
  unread?: boolean;
  limit?: number | null;
};

export const listNotifications = async ({
  supabaseClient,
  userId,
  unread = false,
  limit = null,
}: ListNotificationsParams): Promise<{
  data: NotificationItemData[] | null;
  error: SupabaseError;
}> => {
  let query = supabaseClient
    .from("notifications")
    .select(NOTIFICATION_SELECT_COLUMNS)
    .eq("recipient_user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (unread) {
    query = query.eq("is_read", false);
  }

  if (typeof limit === "number" && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error }: { data: NotificationItemData[] | null; error: SupabaseError } =
    await query;

  return {
    data,
    error,
  };
};

type NotifyAdminsParams = {
  type: NotificationType;
  actorUserId: NonNullable<NotificationRow["actor_user_id"]>;
  feedbackId: NonNullable<NotificationRow["feedback_id"]>;
  feedbackSummary?: FeedbackPublicRow["summary"];
  commentId?: FeedbackCommentRow["id"];
  metadata?: NotificationRow["metadata"];
};

type InsertedNotificationId = Pick<NotificationRow, "id">;

export const notifyAdmins = async ({
  type,
  actorUserId,
  feedbackId,
  feedbackSummary,
  commentId,
  metadata = {},
}: NotifyAdminsParams): Promise<InsertedNotificationId[]> => {
  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const {
    data: roleData,
    error: roleError,
  }: {
    data: { user_id: NotificationRow["recipient_user_id"] }[] | null;
    error: SupabaseError;
  } = await supabaseServerAdminClient.from("user_roles").select("user_id").eq("role", "admin");

  if (roleError) {
    throw new Error("Admin 권한 유저의 데이터를 가져오지 못했습니다.");
  }

  const adminUserIds = (roleData ?? [])
    .map((row) => row.user_id)
    .filter((adminUserId) => adminUserId !== actorUserId);

  if (adminUserIds.length === 0) {
    return [];
  }

  const notificationRows = await Promise.all(
    adminUserIds.map(async (adminUserId) => {
      const buildNotificationData = await buildNotificationContent({
        type,
        feedback_id: feedbackId,
        recipient_user_id: adminUserId,
        actor_user_id: actorUserId,
        feedback_summary: feedbackSummary,
        comment_id: commentId,
      });

      return {
        ...buildNotificationData,
        metadata,
      };
    })
  );

  const {
    data: insertedNotifications,
    error: notificationInsertError,
  }: {
    data: InsertedNotificationId[] | null;
    error: SupabaseError;
  } = await supabaseServerAdminClient.from("notifications").insert(notificationRows).select("id");

  if (notificationInsertError || !insertedNotifications) {
    console.error("Insert notifications failed", notificationInsertError);
    throw new Error("알림 데이터를 추가하지 못했습니다.");
  }

  return insertedNotifications;
};
