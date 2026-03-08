import React from "react";
import Link from "next/link";
import { GithubLoginBtn } from "@/components/common";
import { useForm } from "react-hook-form";
import { EMAIL_PATTERN, inputBaseStyle } from "@/constants";
import { useRouter } from "next/router";
import { Button, useAlert } from "@/components/ui";
import { useSession } from "@/components/session";
import { replaceSafely } from "@/lib/navigation/client";

type SignUpForm = {
  signup_name?: string;
  signup_email: string;
  signup_password: string;
};

const SIGNUP_EMAIL_FORM: SignUpForm = {
  signup_name: "",
  signup_email: "",
  signup_password: "",
};

const getSignupErrorMessage = (message?: string) => {
  const normalized = (message ?? "").toLowerCase();
  if (normalized.includes("already registered") || normalized.includes("user already registered")) {
    return "이미 가입된 이메일입니다.";
  }
  if (normalized.includes("invalid email")) {
    return "유효한 이메일 형식이 아닙니다.";
  }
  if (
    normalized.includes("password should be at least") ||
    normalized.includes("password is too short")
  ) {
    return "비밀번호는 더 길게 입력해주세요.";
  }
  if (normalized.includes("email rate limit exceeded")) {
    return "인증 메일 발송 한도를 초과했습니다. 2시간 후에 다시 시도해주세요.";
  }
  return "회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.";
};

export default function SignupPage() {
  const { openAlert } = useAlert();
  const { supabaseClient } = useSession();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({
    mode: "onSubmit",
    defaultValues: SIGNUP_EMAIL_FORM,
  });

  const onSubmit = async (values: SignUpForm) => {
    if (isSubmitting) return;
    if (!supabaseClient) return;

    const trimmedName = values.signup_name?.trim();
    const userMetadata: Record<string, string> = {};

    if (trimmedName) userMetadata.name = trimmedName;

    const { data, error } = await supabaseClient.auth.signUp({
      email: values.signup_email,
      password: values.signup_password,
      options: {
        emailRedirectTo: `${window.location.origin}/my`,
        data: userMetadata,
      },
    });

    if (error) {
      openAlert({
        description: getSignupErrorMessage(error.message),
      });
      return;
    }

    // 이메일 인증을 안하는 경우
    if (data.session) {
      sessionStorage.setItem("signUpCompleteAndSkipRoleSync", "1");
      openAlert({
        description: "회원가입이 완료되었습니다.\n추가 정보를 입력해주세요.",
        onOk: () => {
          void replaceSafely(router, "/my");
        },
      });
      return;
    }

    openAlert({
      description: "이메일 인증 후 추가 정보를 입력해주세요.",
      onOk: () => {
        void replaceSafely(router, "/login?next=/my");
      },
    });
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-white/80 p-7 shadow-lg dark:border-white/10 dark:bg-neutral-900/70">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(160,160,160,0.14),transparent_70%)] dark:bg-[radial-gradient(circle,rgba(120,120,120,0.12),transparent_70%)]"
        />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary dark:bg-primary/20 dark:text-primary-foreground">
            Sign Up
          </span>
          <h3 className="mt-3 text-2xl font-semibold text-foreground">회원가입</h3>
          <p className="mt-2 text-sm text-muted-foreground">필수 정보는 이메일과 비밀번호예요.</p>
        </div>

        <form className="relative z-10 mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="signup_name">
              이름 (선택)
            </label>
            <input
              className={inputBaseStyle}
              type="text"
              placeholder="홍길동"
              {...register("signup_name", {
                setValueAs: (value) => (typeof value === "string" ? value.trim() : value),
              })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="signup_email">
              이메일
            </label>
            <input
              className={inputBaseStyle}
              type="email"
              placeholder="someone@email.com"
              {...register("signup_email", {
                required: "필수 입력값입니다.",
                setValueAs: (value) => (typeof value === "string" ? value.trim() : value),
                pattern: {
                  value: EMAIL_PATTERN,
                  message: "유효한 이메일 형식이 아닙니다.",
                },
              })}
            />
            {errors.signup_email && (
              <span className="text-xs text-destructive">{errors.signup_email.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-semibold text-muted-foreground"
              htmlFor="signup_password"
            >
              비밀번호
            </label>
            <input
              className={inputBaseStyle}
              type="password"
              placeholder="비밀번호를 입력하세요"
              {...register("signup_password", {
                required: "필수 입력값입니다.",
                validate: {
                  notBlank: (value) => !!value.trim() || "공백으로 입력할 수 없습니다.",
                  minLength: (value) =>
                    value.trim().length >= 8 || "비밀번호는 8자 이상 입력해주세요.",
                },
              })}
            />
            {errors.signup_password && (
              <span className="text-xs text-destructive">{errors.signup_password.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button type="submit" disabled={isSubmitting}>
              회원가입
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border/70 before:content-[''] after:h-px after:flex-1 after:bg-border/70 after:content-['']">
              또는
            </div>

            <GithubLoginBtn />
          </div>
        </form>

        <div className="mt-5 text-center text-sm text-muted-foreground">
          이미 계정이 있나요?{" "}
          <Link href="/login" className="font-semibold text-primary">
            로그인
          </Link>
        </div>
      </section>
    </div>
  );
}
