import type { NotificationItemData, NotificationRow } from "@/types/notification";

export function toNotificationItemData(notification: NotificationRow): NotificationItemData {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    is_read: notification.is_read,
    read_at: notification.read_at,
    created_at: notification.created_at,
  };
}
