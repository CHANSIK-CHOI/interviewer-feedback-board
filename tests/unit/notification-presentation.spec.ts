import { expect, test } from "@playwright/test";
import {
  NOTIFICATION_TONE_BY_TYPE,
  NOTIFICATION_TONE_STYLE,
  NOTIFICATION_TYPE_LABEL,
  type NotificationTone,
} from "@/lib/notification/presentation";
import type { NotificationType } from "@/types/notification";

const notificationTypes: NotificationType[] = [
  "feedback_submitted",
  "feedback_resubmitted",
  "feedback_approved",
  "feedback_rejected",
  "feedback_comment",
  "feedback_reply",
];

test.describe("notification presentation rules", () => {
  test("defines a tone and label for every notification type", () => {
    expect(Object.keys(NOTIFICATION_TONE_BY_TYPE).sort()).toEqual([...notificationTypes].sort());
    expect(Object.keys(NOTIFICATION_TYPE_LABEL).sort()).toEqual([...notificationTypes].sort());
  });

  test("keeps feedback rejection in danger tone", () => {
    expect(NOTIFICATION_TONE_BY_TYPE.feedback_rejected).toBe("danger");
  });

  test("defines style classes for every supported tone", () => {
    const tones = Array.from(new Set<NotificationTone>(Object.values(NOTIFICATION_TONE_BY_TYPE)));

    for (const tone of tones) {
      expect(NOTIFICATION_TONE_STYLE[tone]).toEqual(expect.any(String));
      expect(NOTIFICATION_TONE_STYLE[tone].length).toBeGreaterThan(0);
    }
  });
});
