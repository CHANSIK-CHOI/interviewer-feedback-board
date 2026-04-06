import { useCallback } from "react";
import type { AlertProps } from "@/components/ui";
import { markAllNotificationAsRead, markNotificationAsRead } from "@/lib/notification";
import type { SetNotificationsState } from "./notification-data";

type UseNotificationActionsParams = {
  getAccessTokenOrThrow: () => Promise<string>;
  openAlert: (props: AlertProps) => void;
  setNotifications: SetNotificationsState;
};

export function useNotificationActions({
  getAccessTokenOrThrow,
  openAlert,
  setNotifications,
}: UseNotificationActionsParams) {
  const markAllAsRead = useCallback(async () => {
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
  }, [getAccessTokenOrThrow, openAlert, setNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
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
    },
    [getAccessTokenOrThrow, openAlert, setNotifications]
  );

  return {
    markAllAsRead,
    markAsRead,
  };
}
