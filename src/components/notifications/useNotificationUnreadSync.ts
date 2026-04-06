import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";
import { getAllNotifications } from "@/lib/notification";
import type { SetNotificationsState } from "./state";

type UseNotificationUnreadSyncParams = {
  session: Session | null;
  getAccessTokenOrThrow: () => Promise<string>;
  setNotifications: SetNotificationsState;
};

export function useNotificationUnreadSync({
  session,
  getAccessTokenOrThrow,
  setNotifications,
}: UseNotificationUnreadSyncParams) {
  useEffect(() => {
    if (!session) {
      setNotifications([]);
      return;
    }

    const controller = new AbortController();

    void (async () => {
      try {
        const accessToken = await getAccessTokenOrThrow();
        const data = await getAllNotifications({
          accessToken,
          signal: controller.signal,
          unread: true,
        });

        if (controller.signal.aborted) return;
        setNotifications(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setNotifications([]);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [session, getAccessTokenOrThrow, setNotifications]);
}
