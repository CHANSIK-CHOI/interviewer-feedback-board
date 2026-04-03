import { expect, test, type Page } from "@playwright/test";

const githubEmail = process.env.GITHUB_TEST_EMAIL;
const githubPassword = process.env.GITHUB_TEST_PASSWORD;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const GOOGLE_HOSTS = new Set(["accounts.google.com"]);

type UserRoleSyncPayload = {
  data: { role: "admin" | "reviewer"; isNewUser: boolean } | null;
  error: string | null;
};

const isOnLocalApp = (page: Page) => {
  const { hostname } = new URL(page.url());
  return LOCAL_HOSTS.has(hostname);
};

async function clickGithubSignIn(page: Page) {
  const primarySubmit = page.locator('input[type="submit"][value="Sign in"]').first();
  if (await primarySubmit.isVisible().catch(() => false)) {
    await primarySubmit.click();
    return;
  }

  await page.getByRole("button", { name: /sign in/i }).click();
}

async function clickGithubAuthorizeIfNeeded(page: Page) {
  const authorizeSubmit = page
    .locator(
      [
        'button[type="submit"]:has-text("Authorize")',
        'button[type="submit"]:has-text("Continue")',
        'input[type="submit"][value*="Authorize"]',
        'input[type="submit"][value*="Continue"]',
      ].join(", ")
    )
    .first();

  if (await authorizeSubmit.isVisible().catch(() => false)) {
    await authorizeSubmit.click();
    return true;
  }

  return false;
}

async function clickGithubContinueWithGoogleIfNeeded(page: Page) {
  const continueWithGoogle = page.getByRole("button", { name: /continue with google/i });
  if (await continueWithGoogle.isVisible().catch(() => false)) {
    await continueWithGoogle.click();
    return true;
  }

  return false;
}

async function clickNextButton(page: Page) {
  const nextButton = page.getByRole("button", { name: /^next$/i });
  await nextButton.click();
}

async function completeGoogleOAuth(page: Page, email: string, password: string) {
  const emailInput = page.getByRole("textbox", { name: /email or phone/i });
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.click();
    await emailInput.fill("");
    await emailInput.pressSequentially(email, { delay: 40 });
    await expect(emailInput).toHaveValue(email);
    await clickNextButton(page);
    await page.waitForLoadState("domcontentloaded");
  }

  const passwordInput = page.locator('input[type="password"], input[name="Passwd"]').first();
  if (await passwordInput.isVisible({ timeout: 30_000 }).catch(() => false)) {
    await passwordInput.click();
    await passwordInput.fill("");
    await passwordInput.pressSequentially(password, { delay: 40 });
    await expect(passwordInput).toHaveValue(password);
    await clickNextButton(page);
    await page.waitForLoadState("domcontentloaded");
  }

  const isVerificationPage = await page
    .getByText(/2-step verification|verify it'?s you|check your phone|confirm it'?s you/i)
    .isVisible()
    .catch(() => false);

  if (isVerificationPage) {
    throw new Error(
      "Google이 추가 본인 확인을 요구하고 있습니다. 검증이 없는 테스트 계정이 필요합니다."
    );
  }
}

async function completeGitHubOAuth(page: Page, email: string, password: string) {
  await page.waitForURL(
    (url) =>
      LOCAL_HOSTS.has(url.hostname) ||
      url.hostname.includes("github.com") ||
      GOOGLE_HOSTS.has(url.hostname),
    { timeout: 120_000 }
  );

  for (let step = 0; step < 6; step += 1) {
    if (isOnLocalApp(page)) return;

    const currentUrl = new URL(page.url());
    if (GOOGLE_HOSTS.has(currentUrl.hostname)) {
      await completeGoogleOAuth(page, email, password);
      continue;
    }

    if (!currentUrl.hostname.includes("github.com")) {
      await page.waitForURL(
        (url) =>
          LOCAL_HOSTS.has(url.hostname) ||
          url.hostname.includes("github.com") ||
          GOOGLE_HOSTS.has(url.hostname),
        { timeout: 30_000 }
      );
      continue;
    }

    if (
      currentUrl.pathname.includes("two-factor") ||
      (await page.locator('input[name="app_otp"]').isVisible().catch(() => false))
    ) {
      throw new Error("GitHub 테스트 계정에 2FA가 걸려 있어 자동 OAuth 테스트를 진행할 수 없습니다.");
    }

    const isGoogleBackedGitHubLogin = await clickGithubContinueWithGoogleIfNeeded(page);
    if (isGoogleBackedGitHubLogin) {
      await page.waitForLoadState("domcontentloaded");
      continue;
    }

    if (currentUrl.pathname === "/login") {
      await page.locator('input[name="login"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await clickGithubSignIn(page);
      await page.waitForLoadState("domcontentloaded");
      continue;
    }

    const isAuthorized = await clickGithubAuthorizeIfNeeded(page);
    if (isAuthorized) {
      await page.waitForLoadState("domcontentloaded");
      continue;
    }

    const isVerificationPage = await page
      .getByText(/verify your account|device verification|suspicious login/i)
      .isVisible()
      .catch(() => false);

    if (isVerificationPage) {
      throw new Error(
        "GitHub가 추가 본인 확인을 요구하고 있습니다. 검증이 없는 테스트 계정으로 다시 시도해야 합니다."
      );
    }

    await page.waitForURL(
      (url) =>
        LOCAL_HOSTS.has(url.hostname) ||
        url.hostname.includes("github.com") ||
        GOOGLE_HOSTS.has(url.hostname),
      { timeout: 30_000 }
    );
  }

  throw new Error(`GitHub OAuth 플로우가 로컬 앱으로 돌아오지 않았습니다. current=${page.url()}`);
}

test.describe("github oauth callback", () => {
  test("syncs role and redirects after GitHub login", async ({ page }) => {
    test.skip(
      !githubEmail || !githubPassword,
      "GITHUB_TEST_EMAIL and GITHUB_TEST_PASSWORD are required."
    );

    const sessionSyncPromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/session") &&
        response.request().method() === "POST" &&
        response.status() === 200,
      { timeout: 120_000 }
    );

    const roleSyncPromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/user-roles") &&
        response.request().method() === "POST" &&
        [200, 201].includes(response.status()),
      { timeout: 120_000 }
    );

    await page.goto("/login");
    await page.getByRole("button", { name: /GitHub로 로그인/ }).click();

    await completeGitHubOAuth(page, githubEmail!, githubPassword!);
    await sessionSyncPromise;

    const roleSyncPayload = (await (await roleSyncPromise).json()) as UserRoleSyncPayload;
    expect(roleSyncPayload.error).toBeNull();
    expect(roleSyncPayload.data?.role).toBeTruthy();

    await page.waitForURL(
      (url) => LOCAL_HOSTS.has(url.hostname) && url.pathname !== "/login/oauth-callback",
      { timeout: 120_000 }
    );

    const expectedPath = roleSyncPayload.data?.isNewUser ? "/my" : "/";
    expect(new URL(page.url()).pathname).toBe(expectedPath);

    if (expectedPath === "/my") {
      await expect(page.getByRole("heading", { name: "마이페이지" })).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { name: "인터뷰어 피드백 보드" })).toBeVisible();
    }

    await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();
  });
});
