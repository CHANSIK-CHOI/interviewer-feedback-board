import { ReactNode, useEffect, useState } from "react";

import {
  getAllNotifications,
  markAllNotificationAsRead,
  markNotificationAsRead,
} from "@/lib/notification";
import { NotificationItemData } from "@/types/notification";
import { useSession } from "../session";
import { useAlert } from "../ui";
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
  const { session, getAccessTokenOrThrow } = useSession();
  const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
  const { openAlert } = useAlert();

  useEffect(() => {
    if (!session) {
      setNotifications([]);
      return;
    }
    const controller = new AbortController();

    void (async () => {
      try {
        const accessToken = await getAccessTokenOrThrow();

        const data: NotificationItemData[] = await getAllNotifications({
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
  }, [session, getAccessTokenOrThrow]);

  const markAllAsRead = async () => {
    const accessToken = await getAccessTokenOrThrow();
    try {
      await markAllNotificationAsRead(accessToken);
      setNotifications([]);
    } catch (error) {
      console.error(error);
      openAlert({
        description: "알림 모두 읽기가 실패했습니다.\n다시 시도해주세요.",
      });
    }
  };

  const markAsRead = async (id: string) => {
    const accessToken = await getAccessTokenOrThrow();
    try {
      await markNotificationAsRead({ accessToken, notiId: id });
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error(error);
      openAlert({
        description: "알림 읽기가 실패했습니다.\n다시 시도해주세요.",
      });
    }
  };

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
