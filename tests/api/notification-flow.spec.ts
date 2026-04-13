import { expect, test } from "@playwright/test";
import type { FeedbackPublicBase, ReviewFeedbackResultWithReviewerName } from "@/types/feedback";
import type { FeedbackComment } from "@/types/feedback-comment";
import type { NotificationItemData } from "@/types/notification";
import { adminAccount, reviewerAccount } from "../utils/accounts";
import {
  countNotificationsByFeedback,
  createSupabaseServiceTestClient,
  createSupabaseTestClient,
  readApiData,
  signInTestUser,
  waitForNotification,
} from "../utils/api";

const createUniqueLabel = (prefix: string) => `${prefix} ${Date.now()}`;

const buildFeedbackPayload = (summary: string) => ({
  display_name: "Playwright Reviewer",
  company_name: "Playwright Test",
  is_company_public: true,
  avatar: null,
  summary,
  strengths: "API 테스트로 피드백 생성 흐름을 검증합니다.",
  questions: "승인, 코멘트, 알림 생성 흐름이 정상인지 확인합니다.",
  suggestions: "테스트 종료 시 생성한 데이터를 정리합니다.",
  rating: 5,
  tags: ["notification", "test"],
});

test.describe("notification API flow", () => {
  test("creates notifications for review/comment/reply and removes them with deleted feedback", async ({
    request,
  }) => {
    const reviewerClient = createSupabaseTestClient();
    const adminClient = createSupabaseTestClient();
    const serviceClient = createSupabaseServiceTestClient();
    const reviewer = await signInTestUser(reviewerClient, reviewerAccount);
    const admin = await signInTestUser(adminClient, adminAccount);
    let feedbackId: FeedbackPublicBase["id"] | null = null;

    try {
      const createdFeedback = await readApiData<{ id: FeedbackPublicBase["id"] }>(
        await request.post("/api/feedbacks/new", {
          headers: { Authorization: `Bearer ${reviewer.accessToken}` },
          data: buildFeedbackPayload(createUniqueLabel("Playwright 알림 승인 검증")),
        })
      );
      feedbackId = createdFeedback.id;

      await waitForNotification(adminClient, {
        recipientUserId: admin.userId,
        feedbackId,
        type: "feedback_submitted",
      });

      const reviewedFeedback = await readApiData<ReviewFeedbackResultWithReviewerName>(
        await request.patch(`/api/feedbacks/${feedbackId}/review`, {
          headers: { Authorization: `Bearer ${admin.accessToken}` },
          data: { action: "approve" },
        })
      );
      expect(reviewedFeedback.status).toBe("approved");

      await waitForNotification(reviewerClient, {
        recipientUserId: reviewer.userId,
        feedbackId,
        type: "feedback_approved",
      });

      const authorComment = await readApiData<FeedbackComment>(
        await request.post(`/api/feedbacks/${feedbackId}/comments`, {
          headers: { Authorization: `Bearer ${reviewer.accessToken}` },
          data: {
            body: "작성자가 남기는 API 알림 검증 코멘트입니다.",
            parentCommentId: null,
          },
        })
      );

      await waitForNotification(adminClient, {
        recipientUserId: admin.userId,
        feedbackId,
        type: "feedback_comment",
        commentId: authorComment.id,
      });

      const adminReply = await readApiData<FeedbackComment>(
        await request.post(`/api/feedbacks/${feedbackId}/comments`, {
          headers: { Authorization: `Bearer ${admin.accessToken}` },
          data: {
            body: "관리자가 남기는 API 알림 검증 답글입니다.",
            parentCommentId: authorComment.id,
          },
        })
      );

      const replyNotification = await waitForNotification(reviewerClient, {
        recipientUserId: reviewer.userId,
        feedbackId,
        type: "feedback_reply",
        commentId: adminReply.id,
      });
      expect(replyNotification.link).toContain(`commentId=${adminReply.id}`);

      const { data: duplicateCommentNotifications, error: duplicateCommentError } =
        await reviewerClient
          .from("notifications")
          .select("id")
          .eq("recipient_user_id", reviewer.userId)
          .eq("feedback_id", feedbackId)
          .eq("comment_id", adminReply.id)
          .eq("type", "feedback_comment");

      expect(duplicateCommentError).toBeNull();
      expect(duplicateCommentNotifications).toHaveLength(0);

      const readNotifications = await readApiData<NotificationItemData[]>(
        await request.patch("/api/notifications/read", {
          headers: { Authorization: `Bearer ${reviewer.accessToken}` },
          data: { ids: [replyNotification.id] },
        })
      );

      expect(readNotifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: replyNotification.id,
            is_read: true,
          }),
        ])
      );

      await readApiData<{ id: FeedbackPublicBase["id"] }>(
        await request.delete(`/api/feedbacks/${feedbackId}/delete`, {
          headers: { Authorization: `Bearer ${reviewer.accessToken}` },
        })
      );

      const remainingNotificationCount = await countNotificationsByFeedback(
        serviceClient ?? reviewerClient,
        feedbackId
      );

      expect(remainingNotificationCount).toBe(0);
      feedbackId = null;
    } finally {
      if (feedbackId) {
        await request
          .delete(`/api/feedbacks/${feedbackId}/delete`, {
            headers: { Authorization: `Bearer ${reviewer.accessToken}` },
          })
          .catch(() => undefined);
      }
    }
  });

  test("sends rejected notification to feedback author", async ({ request }) => {
    const reviewerClient = createSupabaseTestClient();
    const adminClient = createSupabaseTestClient();
    const reviewer = await signInTestUser(reviewerClient, reviewerAccount);
    const admin = await signInTestUser(adminClient, adminAccount);
    let feedbackId: FeedbackPublicBase["id"] | null = null;

    try {
      const createdFeedback = await readApiData<{ id: FeedbackPublicBase["id"] }>(
        await request.post("/api/feedbacks/new", {
          headers: { Authorization: `Bearer ${reviewer.accessToken}` },
          data: buildFeedbackPayload(createUniqueLabel("Playwright 알림 반려 검증")),
        })
      );
      feedbackId = createdFeedback.id;

      const reviewedFeedback = await readApiData<ReviewFeedbackResultWithReviewerName>(
        await request.patch(`/api/feedbacks/${feedbackId}/review`, {
          headers: { Authorization: `Bearer ${admin.accessToken}` },
          data: { action: "reject" },
        })
      );

      expect(reviewedFeedback.status).toBe("rejected");

      await waitForNotification(reviewerClient, {
        recipientUserId: reviewer.userId,
        feedbackId,
        type: "feedback_rejected",
      });
    } finally {
      if (feedbackId) {
        await request
          .delete(`/api/feedbacks/${feedbackId}/delete`, {
            headers: { Authorization: `Bearer ${reviewer.accessToken}` },
          })
          .catch(() => undefined);
      }
    }
  });
});
