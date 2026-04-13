import { expect, test, type Page } from "@playwright/test";
import { adminAccount, reviewerAccount } from "../utils/accounts";
import { loginByEmail } from "../utils/browser-auth";

const createUniqueLabel = (prefix: string) => `${prefix} ${Date.now()}`;

async function acceptAlert(page: Page, description: string, expectedPathname?: string) {
  const dialog = page.getByRole("alertdialog").filter({ hasText: description }).last();
  await expect(dialog).toContainText(description);

  if (expectedPathname) {
    await Promise.all([
      page.waitForURL((url) => url.pathname === expectedPathname, { timeout: 30_000 }),
      dialog.getByRole("button", { name: "확인", exact: true }).click(),
    ]);
    return;
  }

  await dialog.getByRole("button", { name: "확인", exact: true }).click();
}

async function confirmDialog(page: Page, title: string, actionText: string) {
  const dialog = page.getByRole("alertdialog").filter({ hasText: title }).last();
  await expect(dialog).toContainText(title);
  await dialog.getByRole("button", { name: actionText, exact: true }).click();
}

async function openFeedbackDetailFromList(page: Page, summary: string) {
  const card = page.locator("article").filter({ hasText: summary }).first();
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: "상세 보기" }).click();
  await expect(page).toHaveURL(/\/feedback\/[^/]+$/);
}

async function cleanupFeedback(page: Page) {
  const headerSection = page.locator("section").first();
  const deleteButton = headerSection.getByRole("button", { name: "삭제", exact: true });

  if (!(await deleteButton.isVisible().catch(() => false))) {
    return false;
  }

  await deleteButton.click();
  await confirmDialog(page, "피드백 삭제 확인", "삭제");
  await acceptAlert(page, "피드백을 삭제했습니다.", "/feedback");
  return true;
}

test.describe("reviewer/admin feedback workflow", () => {
  test.describe.configure({ mode: "serial" });

  test("reviewer creates and edits feedback, admin approves it, reviewer manages comments", async ({
    browser,
  }) => {
    const reviewerContext = await browser.newContext();
    const adminContext = await browser.newContext();
    const reviewerPage = await reviewerContext.newPage();
    const adminPage = await adminContext.newPage();

    const initialSummary = createUniqueLabel("Playwright reviewer 피드백");
    const editedSummary = createUniqueLabel("Playwright reviewer 수정본");
    const commentBody = createUniqueLabel("Playwright 코멘트");
    const updatedCommentBody = createUniqueLabel("Playwright 코멘트 수정");
    let feedbackPath: string | null = null;

    try {
      await loginByEmail(reviewerPage, reviewerAccount);

      await reviewerPage.goto("/feedback/new");
      await expect(reviewerPage.getByRole("heading", { name: "피드백 작성" })).toBeVisible();

      await reviewerPage.getByText("5점", { exact: true }).click();
      await reviewerPage.getByLabel("한줄평").fill(initialSummary);
      await reviewerPage.getByLabel("강점").fill("Playwright로 reviewer 작성 플로우를 검증합니다.");
      await reviewerPage
        .getByLabel("질문/궁금한 점")
        .fill("수정 이후 승인 상태 전이가 정상인지 확인합니다.");
      await reviewerPage
        .getByLabel("개선 제안")
        .fill("관리자 승인과 코멘트 작성까지 한 흐름으로 검증합니다.");
      await reviewerPage.getByText("# 문제 해결력", { exact: true }).click();

      await reviewerPage.getByRole("button", { name: "제출하기" }).click();
      await acceptAlert(
        reviewerPage,
        "피드백이 등록되었습니다.\n관리자 승인 후 전체 공개됩니다.",
        "/feedback"
      );

      await openFeedbackDetailFromList(reviewerPage, initialSummary);
      feedbackPath = new URL(reviewerPage.url()).pathname;

      await reviewerPage.getByRole("link", { name: "수정하기" }).click();
      await expect(reviewerPage.getByRole("heading", { name: "피드백 수정" })).toBeVisible();

      await reviewerPage.getByLabel("한줄평").fill(editedSummary);
      await reviewerPage
        .getByLabel("질문/궁금한 점")
        .fill("승인 후 코멘트 작성 가능 여부를 함께 확인합니다.");
      await reviewerPage.getByRole("button", { name: "수정 완료" }).click();
      await acceptAlert(
        reviewerPage,
        "피드백이 수정되었습니다.\n승인 검토가 다시 진행됩니다.",
        feedbackPath
      );

      await expect(reviewerPage.getByRole("heading", { name: editedSummary })).toBeVisible();

      await loginByEmail(adminPage, adminAccount);
      await adminPage.goto("/admin/feedback");

      const adminCard = adminPage.locator("article").filter({ hasText: editedSummary }).first();
      await expect(adminCard).toBeVisible();
      await adminCard.getByRole("button", { name: "승인", exact: true }).click();
      await acceptAlert(adminPage, "피드백을 승인했습니다.");
      await expect(adminCard).toContainText("승인됨");

      await reviewerPage.goto(feedbackPath);
      await expect(reviewerPage.getByRole("heading", { name: editedSummary })).toBeVisible();
      await expect(
        reviewerPage.getByRole("heading", { name: "코멘트", exact: true })
      ).toBeVisible();

      const composerTextarea = reviewerPage.locator('textarea[id^="feedback-comment-draft-"]');
      await composerTextarea.fill(commentBody);
      await reviewerPage.getByRole("button", { name: "코멘트 등록", exact: true }).click();

      const commentsSection = reviewerPage
        .locator("section")
        .filter({ has: reviewerPage.getByRole("heading", { name: "코멘트", exact: true }) })
        .first();
      const commentItem = commentsSection
        .locator("article")
        .filter({ hasText: commentBody })
        .first();

      await expect(commentItem).toBeVisible();
      await commentItem.getByRole("button", { name: "수정", exact: true }).click();
      await reviewerPage.getByLabel("코멘트 수정").fill(updatedCommentBody);
      await reviewerPage.getByRole("button", { name: "수정 저장", exact: true }).click();

      const updatedCommentItem = commentsSection
        .locator("article")
        .filter({ hasText: updatedCommentBody })
        .first();

      await expect(updatedCommentItem).toBeVisible();
      await updatedCommentItem.getByRole("button", { name: "삭제", exact: true }).click();
      await confirmDialog(reviewerPage, "코멘트 삭제 확인", "삭제");
      await expect(updatedCommentItem).toHaveCount(0);

      if (await cleanupFeedback(reviewerPage)) {
        feedbackPath = null;
      }
    } finally {
      if (feedbackPath) {
        await reviewerPage.goto(feedbackPath).catch(() => null);
        await cleanupFeedback(reviewerPage).catch(() => null);
      }

      await reviewerContext.close();
      await adminContext.close();
    }
  });
});
