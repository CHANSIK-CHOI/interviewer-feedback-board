import type { NotificationItemData, NotificationRow } from "@/types/notification";
import { createContext, useContext } from "react";

type NotificationsContextValue = {
  notifications: NotificationItemData[];
  notifiBellErrorMsg: string | null;
  markAllAsRead: () => Promise<void>;
  markIdsAsRead: (ids: NotificationRow["id"][]) => Promise<void>;
  markAsRead: (id: NotificationRow["id"]) => Promise<void>;
};

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("NotificationsProvider 안에서만 사용하세요");
  }
  return ctx;
}
