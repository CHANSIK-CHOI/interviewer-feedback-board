import { createContext, useContext } from "react";
import type { NotificationItemData } from "@/types/notification";

type NotificationsContextValue = {
  notifications: NotificationItemData[];
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
};

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("NotificationsProvider 안에서만 사용하세요");
  }
  return ctx;
}
