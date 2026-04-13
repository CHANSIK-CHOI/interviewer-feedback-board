import type { Page } from "@playwright/test";
import type { TestAccount } from "./accounts";

export async function loginByEmail(page: Page, account: TestAccount) {
  await page.goto("/login");

  await page.getByPlaceholder("someone@email.com").fill(account.email);
  await page.getByPlaceholder("비밀번호를 입력하세요").fill(account.password);

  const sessionSyncPromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/session") &&
      response.request().method() === "POST" &&
      response.status() === 200,
    { timeout: 30_000 }
  );

  await Promise.all([
    sessionSyncPromise,
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 }),
    page.getByRole("main").getByRole("button", { name: "로그인", exact: true }).click(),
  ]);
}
