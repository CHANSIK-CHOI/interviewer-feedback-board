import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useEffect } from "react";
import type { NotificationItemData, NotificationRow } from "@/types/notification";
import { toNotificationItemData } from "./notification-data";

type UseNotificationRealtimeParams = {
  session: Session | null;
  supabaseBrowserClient: SupabaseClient | null;
  channelNamePrefix?: string;
  onInsert?: (notification: NotificationItemData) => void;
  onUpdate?: (notification: NotificationItemData) => void;
};

export function useNotificationRealtime({
  session,
  supabaseBrowserClient,
  channelNamePrefix = "notifications",
  onInsert,
  onUpdate,
}: UseNotificationRealtimeParams) {
  useEffect(() => {
    if (!session || !supabaseBrowserClient) return;

    const userId = session.user.id;

    const channel = supabaseBrowserClient
      .channel(`${channelNamePrefix}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          onInsert?.(toNotificationItemData(payload.new as NotificationRow));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          onUpdate?.(toNotificationItemData(payload.new as NotificationRow));
        }
      )
      .subscribe();

    return () => {
      void supabaseBrowserClient.removeChannel(channel);
    };
  }, [channelNamePrefix, onInsert, onUpdate, session, supabaseBrowserClient]);
}
