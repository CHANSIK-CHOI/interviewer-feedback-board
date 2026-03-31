import React, { useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { PageMeta } from "@/components/common";
import { Button, useAlert, useConfirm } from "@/components/ui";
import { useSession } from "@/components/session";
import { buildLoginHref, replaceSafely } from "@/lib/navigation/client";
import { useRouter } from "next/router";
import { inputBaseStyle } from "@/constants";
import { getAuthProviderLabel, getAuthProviders } from "@/lib/auth/provider";
import { resolveAccessToken } from "@/lib/auth/client";
import { WithdrawResponse } from "@/types/response";

type WithdrawForm = {
  confirm_text: string;
  password: string;
  isAgreementChecked: boolean;
};

const WITHD_RAW_FORM: WithdrawForm = {
  confirm_text: "",
  password: "",
  isAgreementChecked: false,
};

const WITHDRAW_CONFIRM_TEXT = "회원탈퇴";

export default function WithdrawPage() {
  const { openAlert } = useAlert();
  const { openConfirm } = useConfirm();
  const { session, supabaseBrowserClient, isInitSessionComplete } = useSession();
  const router = useRouter();
  const user = session?.user;
  const providers = getAuthProviders(user);

  const isEmailProviderLinked = providers.includes("email");
  const isGithubProviderLinked = providers.includes("github");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WithdrawForm>({
    mode: "onSubmit",
    defaultValues: WITHD_RAW_FORM,
  });

  useEffect(() => {
    if (!isInitSessionComplete) return;
    if (session?.access_token) return;
    replaceSafely(router, buildLoginHref("/my/withdraw"));
  }, [isInitSessionComplete, router, session?.access_token]);

  const onSubmit = async (values: WithdrawForm) => {
    if (isSubmitting) return;
    if (!session?.access_token || !supabaseBrowserClient) {
      openAlert({
        description: "로그인 상태를 확인해주세요.",
      });
      return;
    }

    const isConfirmed = await openConfirm({
      title: "회원 탈퇴 확인",
      description:
        "탈퇴하면 계정 데이터가 삭제되며 복구할 수 없습니다.\n정말로 회원 탈퇴를 진행하시겠어요?",
      actionText: "탈퇴 진행",
      cancelText: "취소",
    });

    if (!isConfirmed) return;

    if (isEmailProviderLinked) {
      if (!user?.email) {
        openAlert({
          description: "이메일 계정 정보를 확인할 수 없습니다.",
        });
        return;
      }

      const password = values.password.trim();
      const { error: reauthError } = await supabaseBrowserClient.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (reauthError) {
        openAlert({
          description: "비밀번호가 올바르지 않습니다.",
        });
        return;
      }
    }

    try {
      const accessToken = await resolveAccessToken({
        supabaseBrowserClient,
        fallbackAccessToken: session.access_token,
      });

      const response = await fetch("/api/auth/withdraw", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result: WithdrawResponse = await response.json().catch(() => ({
        data: null,
        error: "Invalid response",
      }));
      if (!response.ok || result.error) {
        openAlert({
          description: result.error ?? "회원 탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
        });
        return;
      }

      await fetch("/api/auth/session", { method: "DELETE" });
      await supabaseBrowserClient.auth.signOut({ scope: "local" }).catch(() => undefined);

      openAlert({
        description: "회원 탈퇴가 완료되었습니다.",
        onOk: () => {
          void replaceSafely(router, "/");
        },
      });
    } catch (error) {
      console.error(error);
      openAlert({
        description:
          error instanceof Error ? error.message : "로그인 상태를 확인해주세요.",
      });
    }
  };

  if (!isInitSessionComplete || !user) {
    return (
      <>
        <PageMeta
          title="회원 탈퇴"
          ogTitle="회원 탈퇴"
          description="계정 탈퇴 전에 연동 정보와 주의사항을 확인할 수 있는 페이지입니다."
        />

        <div className="mx-auto w-full max-w-xl">
          <section className="rounded-2xl border border-border/60 bg-background/80 p-7 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            로그인 상태를 확인하고 있습니다.
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="회원 탈퇴"
        ogTitle="회원 탈퇴"
        description="계정 탈퇴 전에 연동 정보와 주의사항을 확인할 수 있는 페이지입니다."
      />

      <div className="mx-auto w-full max-w-2xl">
        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-7 shadow-sm dark:border-destructive/50 dark:bg-destructive/10">
          <h2 className="text-2xl font-semibold text-foreground">회원 탈퇴</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            탈퇴 전 계정 정보를 확인하고, 안내에 따라 진행해주세요.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {providers.map((provider) => (
              <span
                key={provider}
                className="rounded-full border border-destructive/30 px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {getAuthProviderLabel(provider)} 로그인
              </span>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border/60 bg-background/80 p-7 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground dark:border-white/10">
            <p>계정: {user.email ?? "-"}</p>
            {isEmailProviderLinked && (
              <p className="mt-2">이메일 로그인 계정은 비밀번호 확인이 필요합니다.</p>
            )}
            {isGithubProviderLinked && (
              <p className="mt-2">
                GitHub 로그인 계정은 연동 계정 기준으로 탈퇴되며, 동일 메일로 재가입 시 새 계정으로
                취급됩니다.
              </p>
            )}
          </div>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-semibold text-muted-foreground"
                htmlFor="withdraw_text"
              >
                확인 문구 입력
              </label>
              <input
                id="withdraw_text"
                className={inputBaseStyle}
                type="text"
                placeholder={`정확히 '${WITHDRAW_CONFIRM_TEXT}'를 입력해주세요.`}
                {...register("confirm_text", {
                  required: "확인 문구를 입력해주세요.",
                  validate: (value) =>
                    value.trim() === WITHDRAW_CONFIRM_TEXT ||
                    `확인 문구는 '${WITHDRAW_CONFIRM_TEXT}'와 일치해야 합니다.`,
                })}
              />
              {errors.confirm_text && (
                <span className="text-xs text-destructive">{errors.confirm_text.message}</span>
              )}
            </div>

            {isEmailProviderLinked && (
              <div className="flex flex-col gap-2">
                <label
                  className="text-xs font-semibold text-muted-foreground"
                  htmlFor="withdraw_password"
                >
                  비밀번호 확인 (필수)
                </label>
                <input
                  id="withdraw_password"
                  className={inputBaseStyle}
                  type="password"
                  placeholder="현재 비밀번호를 입력해주세요."
                  {...register("password", {
                    validate: (value) => value.trim().length > 0 || "비밀번호를 입력해 주세요.",
                  })}
                />
                {errors.password && (
                  <span className="text-xs text-destructive">{errors.password.message}</span>
                )}
              </div>
            )}

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-destructive"
                {...register("isAgreementChecked", {
                  validate: (value) => value || "주의사항을 확인하고 동의해주세요.",
                })}
              />
              <span>탈퇴 시 내 계정 데이터가 삭제되고 복구할 수 없다는 점에 동의합니다.</span>
            </label>
            {errors.isAgreementChecked && (
              <span className="text-xs text-destructive">{errors.isAgreementChecked.message}</span>
            )}

            <div className="flex gap-2 pt-2">
              <Button asChild variant="outline">
                <Link href="/my">돌아가기</Link>
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                회원 탈퇴
              </Button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
