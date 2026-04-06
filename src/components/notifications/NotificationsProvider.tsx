import { ReactNode, useState } from "react";
import { NotificationItemData } from "@/types/notification";
import { useSession } from "../session";
import { useAlert } from "../ui";
import { useNotificationActions } from "./useNotificationActions";
import { useNotificationRealtime } from "./useNotificationRealtime";
import { useNotificationUnreadSync } from "./useNotificationUnreadSync";
import { NotificationsContext } from "./useNotifications";

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
  const { session, getAccessTokenOrThrow, supabaseBrowserClient } = useSession();
  const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
  const { openAlert } = useAlert();

  useNotificationUnreadSync({
    session,
    getAccessTokenOrThrow,
    setNotifications,
  });

  useNotificationRealtime({
    session,
    supabaseBrowserClient,
    setNotifications,
  });

  const { markAllAsRead, markAsRead } = useNotificationActions({
    getAccessTokenOrThrow,
    openAlert,
    setNotifications,
  });

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        markAllAsRead,
        markAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
