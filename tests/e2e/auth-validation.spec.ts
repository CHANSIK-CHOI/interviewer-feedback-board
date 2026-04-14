import { expect, test } from "@playwright/test";

test.describe("auth form validation", () => {
  test("validates login form with zod resolver", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("main").getByRole("button", { name: "로그인", exact: true }).click();

    await expect(page.getByText("필수 입력값입니다.")).toHaveCount(2);

    await page.getByPlaceholder("someone@email.com").fill("invalid-email");
    await page.getByPlaceholder("비밀번호를 입력하세요").fill("short");
    await page.getByRole("main").getByRole("button", { name: "로그인", exact: true }).click();

    await expect(page.getByText("유효한 이메일 형식이 아닙니다.")).toBeVisible();
    await expect(page.getByText("비밀번호는 8자 이상 입력해주세요.")).toBeVisible();
  });

  test("validates forgot password form with zod resolver", async ({ page }) => {
    await page.goto("/login/forgot");

    await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();
    await expect(page.getByText("필수 입력값입니다.")).toBeVisible();

    await page.getByPlaceholder("someone@email.com").fill("invalid-email");
    await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();

    await expect(page.getByText("유효한 이메일 형식이 아닙니다.")).toBeVisible();
  });

  test("validates signup form with zod resolver", async ({ page }) => {
    await page.goto("/login/signup");

    await page.getByRole("button", { name: "회원가입", exact: true }).click();
    await expect(page.getByText("필수 입력값입니다.")).toHaveCount(2);

    await page.getByPlaceholder("someone@email.com").fill("invalid-email");
    await page.getByPlaceholder("비밀번호를 입력하세요").fill("short");
    await page.getByRole("button", { name: "회원가입", exact: true }).click();

    await expect(page.getByText("유효한 이메일 형식이 아닙니다.")).toBeVisible();
    await expect(page.getByText("비밀번호는 8자 이상 입력해주세요.")).toBeVisible();
  });

  test("validates reset password form with zod resolver", async ({ page }) => {
    await page.goto("/login/reset");

    await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();
    await expect(page.getByText("필수 입력값입니다.")).toBeVisible();

    await page.getByPlaceholder("8자 이상 입력하세요").fill("short");
    await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();

    await expect(page.getByText("비밀번호는 8자 이상 입력해주세요.")).toBeVisible();
  });
});
