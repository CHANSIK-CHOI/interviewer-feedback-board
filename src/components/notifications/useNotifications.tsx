import { NotificationItemData } from "@/types/notification";
import { createContext, useContext } from "react";

type NotificationsContextValue = {
  notifications: NotificationItemData[];
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
};
export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("NotificationsProvider 안에서만 사용하세요");
  }
  return ctx;
}
