import { NotificationItemData } from "@/types/notification";
import { useRouter } from "next/router";
import { ReactNode, useCallback, useState } from "react";
import { toast } from "sonner";
import { useSession } from "../session";
import { useAlert } from "../ui";
import { NotificationsContext } from "./context";
import { useNotificationActions } from "./useNotificationActions";
import { useNotificationRealtime } from "./useNotificationRealtime";
import { useNotificationUnreadSync } from "./useNotificationUnreadSync";

type NotificationsProviderProps = {
  children: ReactNode;
};

/*
    NotificationsProvider의 역할
    - 알림 상태 관리
    - 초기 fetch
    - unread count 관리
    - Realtime subscribe
    - 새 알림 시 toast
    - markAsRead, markAllAsRead 같은 액션 제공
*/

export default function NotificationsProvider({ children }: NotificationsProviderProps) {
  const router = useRouter();
  const { session, getAccessTokenOrThrow, supabaseBrowserClient } = useSession();
  const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
  const { openAlert } = useAlert();

  const { notifiBellErrorMsg } = useNotificationUnreadSync({
    session,
    getAccessTokenOrThrow,
    setNotifications,
  });

  const { markAllAsRead, markIdsAsRead, markAsRead } = useNotificationActions({
    getAccessTokenOrThrow,
    openAlert,
    setNotifications,
  });

  const handleRealtimeInsert = useCallback(
    (next: NotificationItemData) => {
      if (!next.is_read) {
        setNotifications((prev) => {
          if (prev.some((item) => item.id === next.id)) {
            return prev;
          }

          return [next, ...prev];
        });

        toast.custom((toastId) => (
          <button
            type="button"
            className="flex w-full max-w-sm flex-col items-start gap-1 rounded-xl border border-border bg-background px-4 py-3 text-left shadow-lg transition hover:bg-muted/60"
            onClick={() => {
              toast.dismiss(toastId);
              void (async () => {
                await markAsRead(next.id);
                await router.push(next.link);
              })();
            }}
          >
            <span className="text-sm font-semibold text-foreground">{next.title}</span>
            <span className="text-sm text-muted-foreground">{next.body}</span>
          </button>
        ));
      }
    },
    [markAsRead, router]
  );

  const handleRealtimeUpdate = useCallback((next: NotificationItemData) => {
    setNotifications((prev) => {
      const hasExisting = prev.some((item) => item.id === next.id);

      if (hasExisting) {
        return prev.map((item) => (item.id === next.id ? next : item));
      }

      return [next, ...prev].slice(0, 20);
    });
  }, []);

  useNotificationRealtime({
    session,
    supabaseBrowserClient,
    onInsert: handleRealtimeInsert,
    onUpdate: handleRealtimeUpdate,
  });

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        notifiBellErrorMsg,
        markAllAsRead,
        markIdsAsRead,
        markAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
