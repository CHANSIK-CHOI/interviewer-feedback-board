import { z } from "zod";

const trimmedString = z.string().trim();

export const WITHDRAW_CONFIRM_TEXT = "회원탈퇴";

export const myProfileFormSchema = z
  .object({
    company_name: trimmedString,
    is_company_public: z.boolean(),
    name: trimmedString.min(1, "이름을 입력해주세요."),
    avatar: trimmedString,
  })
  .superRefine(({ company_name, is_company_public }, ctx) => {
    if (!is_company_public || company_name) return;

    ctx.addIssue({
      code: "custom",
      message: "회사명을 입력해주세요",
      path: ["company_name"],
    });
  });

export type WithdrawFormValues = {
  confirm_text: string;
  password: string;
  isAgreementChecked: boolean;
};

export const createWithdrawFormSchema = (isEmailProviderLinked: boolean) =>
  z.object({
    confirm_text: trimmedString.refine((value) => value === WITHDRAW_CONFIRM_TEXT, {
      message: `확인 문구는 '${WITHDRAW_CONFIRM_TEXT}'와 일치해야 합니다.`,
    }),
    password: isEmailProviderLinked
      ? trimmedString.min(1, "비밀번호를 입력해 주세요.")
      : trimmedString,
    isAgreementChecked: z.boolean().refine((value) => value, {
      message: "주의사항을 확인하고 동의해주세요.",
    }),
  });
