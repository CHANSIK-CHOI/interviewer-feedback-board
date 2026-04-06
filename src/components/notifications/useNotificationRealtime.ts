import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useEffect } from "react";
import { toast } from "sonner";
import type { NotificationRow } from "@/types/notification";
import { SetNotificationsState, toNotificationItemData } from "./notification-data";

type UseNotificationRealtimeParams = {
  session: Session | null;
  supabaseBrowserClient: SupabaseClient | null;
  setNotifications: SetNotificationsState;
};

export function useNotificationRealtime({
  session,
  supabaseBrowserClient,
  setNotifications,
}: UseNotificationRealtimeParams) {
  useEffect(() => {
    if (!session || !supabaseBrowserClient) return;

    const userId = session.user.id;

    const channel = supabaseBrowserClient
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          const next = toNotificationItemData(payload.new as NotificationRow);

          if (!next.is_read) {
            setNotifications((prev) => {
              if (prev.some((item) => item.id === next.id)) {
                return prev;
              }

              return [next, ...prev];
            });

            toast(next.title, {
              description: next.body,
            });
          }
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
          const next = toNotificationItemData(payload.new as NotificationRow);

          setNotifications((prev) => {
            if (next.is_read) {
              return prev.filter((item) => item.id !== next.id);
            }

            const hasExisting = prev.some((item) => item.id === next.id);
            if (hasExisting) {
              return prev.map((item) => (item.id === next.id ? next : item));
            }

            return [next, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      void supabaseBrowserClient.removeChannel(channel);
    };
  }, [session, setNotifications, supabaseBrowserClient]);
}
