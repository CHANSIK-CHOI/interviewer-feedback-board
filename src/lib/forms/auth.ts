import { z } from "zod";

const requiredEmailSchema = z
  .string()
  .trim()
  .min(1, "필수 입력값입니다.")
  .email("유효한 이메일 형식이 아닙니다.");

const requiredPasswordSchema = z
  .string()
  .trim()
  .min(1, "필수 입력값입니다.")
  .min(8, "비밀번호는 8자 이상 입력해주세요.");

export const loginFormSchema = z.object({
  login_email: requiredEmailSchema,
  login_password: requiredPasswordSchema,
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const forgotPasswordFormSchema = z.object({
  forgot_email: requiredEmailSchema,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

export const signupFormSchema = z.object({
  signup_name: z.string().trim().optional(),
  signup_email: requiredEmailSchema,
  signup_password: requiredPasswordSchema,
});

export type SignupFormValues = z.infer<typeof signupFormSchema>;

export const resetPasswordFormSchema = z.object({
  reset_password: requiredPasswordSchema,
});

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;
