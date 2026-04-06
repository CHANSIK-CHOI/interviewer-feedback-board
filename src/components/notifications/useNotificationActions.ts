import { useCallback } from "react";
import type { AlertProps } from "@/components/ui";
import { markAllNotificationAsRead, markNotificationAsRead } from "@/lib/notification";
import type { SetNotificationsState } from "./state";

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
    try {
      const accessToken = await getAccessTokenOrThrow();
      await markAllNotificationAsRead(accessToken);
      setNotifications([]);
    } catch (error) {
      console.error(error);
      openAlert({
        description: "알림을 모두 읽음 처리하지 못했습니다.\n다시 시도해주세요.",
      });
    }
  }, [getAccessTokenOrThrow, openAlert, setNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        const accessToken = await getAccessTokenOrThrow();
        await markNotificationAsRead({ accessToken, notiId: id });
        setNotifications((prev) => prev.filter((item) => item.id !== id));
      } catch (error) {
        console.error(error);
        openAlert({
          description: "알림을 읽음 처리하지 못했습니다.\n다시 시도해주세요.",
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
