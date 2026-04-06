import type { FeedbackPublicRow } from "@/types/feedback";

export type NotificationType =
  | "feedback_submitted"
  | "feedback_resubmitted"
  | "feedback_approved"
  | "feedback_rejected"
  | "feedback_comment"
  | "feedback_reply";

export type NotificationFeedbackStatus = FeedbackPublicRow["status"];

export type NotificationMetadata = {
  feedback_status?: NotificationFeedbackStatus | null;
  parent_comment_id?: string | null;
};

/*
  recipient_user_id = 누가 받는가
  actor_user_id = 누가 행동했는가
  feedback_id, comment_id = 무엇에 대한 알림인가
  type, title, body, link = 화면에 어떻게 보여줄 것인가
  is_read, read_at = 읽음 상태
  metadata = 추가 맥락
  created_at = 언제 생겼는가
*/
export type NotificationRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  feedback_id: string | null;
  comment_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  read_at: string | null;
  metadata: NotificationMetadata;
  created_at: string;
};

export type NotificationListItem = NotificationRow;

export type NotificationUnreadCount = {
  count: number;
};

export type NotificationReadResult = Pick<NotificationRow, "id" | "is_read" | "read_at">;

export type NotificationItemData = Pick<
  NotificationRow,
  "id" | "title" | "body" | "is_read" | "created_at"
>;

type NotificationTone = "info" | "success" | "warning";
export type MockNotificationItem = {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  href: string;
  isRead: boolean;
  tone: NotificationTone;
};
