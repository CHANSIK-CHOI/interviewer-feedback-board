import type { AlertProps } from "@/components/ui";
import {
  markAllNotificationAsRead,
  markNotificationAsRead,
  markNotificationsAsRead,
} from "@/lib/notification/client";
import type { NotificationItemData, NotificationRow } from "@/types/notification";
import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";

type SetNotifications = Dispatch<SetStateAction<NotificationItemData[]>>;

type UseNotificationActionsParams = {
  getAccessTokenOrThrow: () => Promise<string>;
  openAlert: (props: AlertProps) => void;
  setNotifications: SetNotifications;
};

export function useNotificationActions({
  getAccessTokenOrThrow,
  openAlert,
  setNotifications,
}: UseNotificationActionsParams) {
  const markAllAsRead = useCallback(async () => {
    try {
      const accessToken = await getAccessTokenOrThrow();
      await markAllNotificationAsRead({ accessToken });
      setNotifications((prev) =>
        prev.map((item) =>
          item.is_read
            ? item
            : {
                ...item,
                is_read: true,
              }
        )
      );
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "알림을 모두 읽음 처리하지 못했습니다.\n다시 시도해주세요.";
      openAlert({
        description: message,
      });
    }
  }, [getAccessTokenOrThrow, openAlert, setNotifications]);

  const markIdsAsRead = useCallback(
    async (ids: NotificationRow["id"][]) => {
      if (ids.length === 0) return;

      try {
        const accessToken = await getAccessTokenOrThrow();
        await markNotificationsAsRead({ accessToken, notiIds: ids });
        const targetIds = new Set(ids);
        setNotifications((prev) =>
          prev.map((item) =>
            targetIds.has(item.id)
              ? {
                  ...item,
                  is_read: true,
                }
              : item
          )
        );
      } catch (error) {
        console.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "알림을 읽음 처리하지 못했습니다.\n다시 시도해주세요.";
        openAlert({
          description: message,
        });
      }
    },
    [getAccessTokenOrThrow, openAlert, setNotifications]
  );

  const markAsRead = useCallback(
    async (id: NotificationRow["id"]) => {
      try {
        const accessToken = await getAccessTokenOrThrow();
        await markNotificationAsRead({ accessToken, notiId: id });
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  is_read: true,
                }
              : item
          )
        );
      } catch (error) {
        console.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "알림을 읽음 처리하지 못했습니다.\n다시 시도해주세요.";
        openAlert({
          description: message,
        });
      }
    },
    [getAccessTokenOrThrow, openAlert, setNotifications]
  );

  return {
    markAllAsRead,
    markIdsAsRead,
    markAsRead,
  };
}
