import React from "react";
import Link from "next/link";
import { GithubLoginBtn, PageMeta } from "@/components/common";
import { useForm } from "react-hook-form";
import { EMAIL_PATTERN, inputBaseStyle } from "@/constants";
import { useRouter } from "next/router";
import { Button, useAlert } from "@/components/ui";
import { useSession } from "@/components/session";
import { getSafeNextPath, replaceSafely } from "@/lib/navigation/client";

type LoginForm = {
  login_email: string;
  login_password: string;
};

const LOGIN_EMAIL_FORM: LoginForm = {
  login_email: "",
  login_password: "",
};

const getLoginErrorMessage = (message?: string) => {
  const normalized = (message ?? "").toLowerCase();
  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid_credentials")
  ) {
    return "이메일 또는 비밀번호를 확인해주세요.";
  }
  if (normalized.includes("email not confirmed")) {
    return "이메일 인증 후 로그인해주세요.";
  }
  return "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.";
};

export default function LoginPage() {
  const { openAlert } = useAlert();
  const { supabaseBrowserClient } = useSession();
  const router = useRouter();
  const nextPath = getSafeNextPath(router.query.next);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    mode: "onSubmit",
    defaultValues: LOGIN_EMAIL_FORM,
  });

  const onSubmit = async (values: LoginForm) => {
    if (isSubmitting) return;
    if (!supabaseBrowserClient) return;

    const { error } = await supabaseBrowserClient.auth.signInWithPassword({
      email: values.login_email.trim(),
      password: values.login_password.trim(),
    });

    if (error) {
      openAlert({
        description: getLoginErrorMessage(error.message),
      });
      return;
    }

    await replaceSafely(router, nextPath);
  };

  return (
    <>
      <PageMeta
        title="로그인"
        ogTitle="로그인"
        description="이메일 또는 GitHub 계정으로 로그인할 수 있는 페이지입니다."
      />

      <div className="mx-auto w-full max-w-xl">
        <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-white/80 p-7 shadow-lg dark:border-white/10 dark:bg-neutral-900/70">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(160,160,160,0.14),transparent_70%)] dark:bg-[radial-gradient(circle,rgba(120,120,120,0.12),transparent_70%)]"
          />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary dark:bg-primary/20 dark:text-primary-foreground">
              Login
            </span>
            <h3 className="mt-3 text-2xl font-semibold text-foreground">로그인</h3>
            <p className="mt-2 text-sm text-muted-foreground">이메일과 비밀번호로 시작하세요.</p>
          </div>

          <form
            className="relative z-10 mt-6 flex flex-col gap-4"
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="login_email">
                이메일
              </label>
              <input
                className={inputBaseStyle}
                type="email"
                placeholder="someone@email.com"
                {...register("login_email", {
                  required: "필수 입력값입니다.",
                  setValueAs: (value) => (typeof value === "string" ? value.trim() : value),
                  pattern: {
                    value: EMAIL_PATTERN,
                    message: "유효한 이메일 형식이 아닙니다.",
                  },
                })}
              />
              {errors.login_email && (
                <span className="text-xs text-destructive">{errors.login_email.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-semibold text-muted-foreground"
                htmlFor="login_password"
              >
                비밀번호
              </label>
              <input
                className={inputBaseStyle}
                type="password"
                placeholder="비밀번호를 입력하세요"
                {...register("login_password", {
                  required: "필수 입력값입니다.",
                  setValueAs: (value) => (typeof value === "string" ? value.trim() : value),
                  validate: {
                    notBlank: (value) => !!value.trim() || "공백으로 입력할 수 없습니다.",
                    minLength: (value) =>
                      value.trim().length >= 8 || "비밀번호는 8자 이상 입력해주세요.",
                  },
                })}
              />
              {errors.login_password && (
                <span className="text-xs text-destructive">{errors.login_password.message}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>비밀번호를 잊으셨나요?</span>
              <Link href="/login/forgot" className="font-semibold text-primary">
                비밀번호 재설정
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              <Button type="submit" disabled={isSubmitting}>
                로그인
              </Button>

              <div className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border/70 before:content-[''] after:h-px after:flex-1 after:bg-border/70 after:content-['']">
                또는
              </div>

              <GithubLoginBtn />
            </div>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            아직 계정이 없나요?{" "}
            <Link href="/login/signup" className="font-semibold text-primary">
              회원가입
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
