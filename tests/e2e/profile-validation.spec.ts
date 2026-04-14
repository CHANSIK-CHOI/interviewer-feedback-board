import { expect, test } from "@playwright/test";
import { reviewerAccount } from "../utils/accounts";
import { loginByEmail } from "../utils/browser-auth";

test.describe("profile form validation", () => {
  test("validates my profile form with zod resolver", async ({ page }) => {
    await loginByEmail(page, reviewerAccount);
    await page.goto("/my");

    const nameInput = page.getByLabel("이름");
    const originalName = await nameInput.inputValue();

    await nameInput.fill("");
    await page.getByRole("button", { name: "내 정보 수정하기", exact: true }).click();
    await expect(page.getByText("이름을 입력해주세요.")).toBeVisible();

    await nameInput.fill(originalName);
  });

  test("validates withdraw form with zod resolver before confirmation", async ({ page }) => {
    await loginByEmail(page, reviewerAccount);
    await page.goto("/my/withdraw");

    await page.getByRole("button", { name: "회원 탈퇴", exact: true }).click();

    await expect(page.getByText("확인 문구는 '회원탈퇴'와 일치해야 합니다.")).toBeVisible();
    await expect(page.getByText("주의사항을 확인하고 동의해주세요.")).toBeVisible();
  });
});
