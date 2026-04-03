import React from "react";
import Link from "next/link";
import { PageMeta } from "@/components/common";
import { Button, useAlert } from "@/components/ui";
import { useForm } from "react-hook-form";
import { EMAIL_PATTERN, inputBaseStyle } from "@/constants";
import { useSession } from "@/components/session";

type ForgotPasswordFormValues = {
  forgot_email: string;
};

const FORGOT_PASSWORD_FORM_DEFAULT_VALUES: ForgotPasswordFormValues = {
  forgot_email: "",
};

const getForgotPasswordErrorMessage = (message?: string) => {
  const normalized = (message ?? "").toLowerCase();
  if (normalized.includes("email rate limit exceeded")) {
    return "인증 메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
  }
  return "비밀번호 변경요청에 실패했습니다. 다시 시도해주세요.";
};

export default function ForgotPasswordPage() {
  const { openAlert } = useAlert();
  const { supabaseBrowserClient } = useSession();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    mode: "onSubmit",
    defaultValues: FORGOT_PASSWORD_FORM_DEFAULT_VALUES,
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    if (isSubmitting) return;
    if (!supabaseBrowserClient) return;

    const { error } = await supabaseBrowserClient.auth.resetPasswordForEmail(
      values.forgot_email.trim(),
      {
        redirectTo: `${window.location.origin}/login/reset`,
      }
    );

    if (error) {
      openAlert({
        description: getForgotPasswordErrorMessage(error.message),
      });
      return;
    }

    openAlert({
      description: "입력하신 이메일로\n비밀번호 재설정 메일이 발송되었습니다.",
    });
  };

  return (
    <>
      <PageMeta
        title="비밀번호 재설정 요청"
        ogTitle="비밀번호 재설정 요청"
        description="비밀번호 재설정 메일을 받을 이메일을 입력할 수 있는 페이지입니다."
      />

      <div className="mx-auto w-full max-w-xl">
        <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-white/80 p-7 shadow-lg dark:border-white/10 dark:bg-neutral-900/70">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(160,160,160,0.14),transparent_70%)] dark:bg-[radial-gradient(circle,rgba(120,120,120,0.12),transparent_70%)]"
          />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary dark:bg-primary/20 dark:text-primary-foreground">
              Reset
            </span>
            <h3 className="mt-3 text-2xl font-semibold text-foreground">비밀번호 재설정</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              비밀번호 재설정 할 이메일을 입력하세요.
            </p>
          </div>

          <form
            className="relative z-10 mt-6 flex flex-col gap-4"
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="forgot_email">
                이메일
              </label>
              <input
                className={inputBaseStyle}
                type="email"
                placeholder="someone@email.com"
                {...register("forgot_email", {
                  required: "필수 입력값입니다.",
                  setValueAs: (value) => (typeof value === "string" ? value.trim() : value),
                  pattern: {
                    value: EMAIL_PATTERN,
                    message: "유효한 이메일 형식이 아닙니다.",
                  },
                })}
              />
              {errors.forgot_email && (
                <span className="text-xs text-destructive">{errors.forgot_email.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Button type="submit" disabled={isSubmitting}>
                비밀번호 변경
              </Button>
            </div>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            로그인 화면으로 돌아가기{" "}
            <Link href="/login" className="font-semibold text-primary">
              로그인
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
