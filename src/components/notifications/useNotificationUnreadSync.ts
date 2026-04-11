import { getAllNotifications } from "@/lib/notification";
import type { NotificationItemData } from "@/types/notification";
import type { Session } from "@supabase/supabase-js";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";

type SetNotifications = Dispatch<SetStateAction<NotificationItemData[]>>;

type UseNotificationUnreadSyncParams = {
  session: Session | null;
  getAccessTokenOrThrow: () => Promise<string>;
  setNotifications: SetNotifications;
};

export function useNotificationUnreadSync({
  session,
  getAccessTokenOrThrow,
  setNotifications,
}: UseNotificationUnreadSyncParams) {
  const [notifiBellErrorMsg, setNotifiBellErrorMsg] = useState<string | null>(null);
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
          limit: 20,
          // unread: true,
        });
        console.log({ data });
        if (controller.signal.aborted) return;
        setNotifications(data);
        setNotifiBellErrorMsg(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setNotifications([]);
        setNotifiBellErrorMsg("알림 목록을 불러오지 못했습니다.");
      }
    })();

    return () => {
      controller.abort();
    };
  }, [session, getAccessTokenOrThrow, setNotifications]);

  return { notifiBellErrorMsg };
}
