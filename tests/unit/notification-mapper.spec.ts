import { expect, test } from "@playwright/test";
import { toNotificationItemData } from "@/lib/notification/mapper";
import type { NotificationRow } from "@/types/notification";

test.describe("notification mapper", () => {
  test("maps a database notification row to the lightweight list item shape", () => {
    const notificationRow: NotificationRow = {
      id: "notification-id",
      recipient_user_id: "recipient-user-id",
      actor_user_id: "actor-user-id",
      feedback_id: "feedback-id",
      comment_id: "comment-id",
      type: "feedback_reply",
      title: "내 코멘트에 답글이 달렸어요",
      body: "관리자가 내 코멘트에 답글을 남겼습니다.",
      link: "/feedback/feedback-id?commentId=comment-id",
      is_read: false,
      read_at: null,
      metadata: {
        feedback_status: "approved",
        parent_comment_id: "parent-comment-id",
      },
      created_at: "2026-04-13T00:00:00.000Z",
    };

    expect(toNotificationItemData(notificationRow)).toEqual({
      id: "notification-id",
      type: "feedback_reply",
      title: "내 코멘트에 답글이 달렸어요",
      body: "관리자가 내 코멘트에 답글을 남겼습니다.",
      link: "/feedback/feedback-id?commentId=comment-id",
      is_read: false,
      created_at: "2026-04-13T00:00:00.000Z",
    });
  });
});
