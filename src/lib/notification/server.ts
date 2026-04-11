import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseError } from "@/types/common";
import type { NotificationItemData, NotificationRow } from "@/types/notification";

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
}: ListNotificationsParams): Promise<{ data: NotificationItemData[] | null; error: SupabaseError }> => {
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
