import Image from "next/image";
import { useFormContext, useWatch } from "react-hook-form";
import { AVATAR_PLACEHOLDER_SRC, inputBaseStyle } from "@/constants";
import { checkAvatarApiSrcPrivate } from "@/lib/avatar/path";
import type { FeedbackFormValues } from "@/types";

type FeedbackFormProfileSectionProps = {
  sessionAvatar: string;
};

export default function FeedbackFormProfileSection({
  sessionAvatar,
}: FeedbackFormProfileSectionProps) {
  const {
    register,
    clearErrors,
    trigger,
    control,
    formState: { errors },
  } = useFormContext<FeedbackFormValues>();

  const isCompanyPublic = useWatch({ control, name: "is_company_public" });

  const avatarSrc = sessionAvatar || AVATAR_PLACEHOLDER_SRC;
  const isPlaceholderAvatar = avatarSrc === AVATAR_PLACEHOLDER_SRC;

  return (
    <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <h3 className="text-lg font-semibold text-foreground">프로필</h3>
      <div className="mt-4 grid gap-5 md:grid-cols-[140px_1fr] md:items-start">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted text-sm text-muted-foreground">
            <Image
              className="h-full w-full object-cover"
              src={avatarSrc}
              alt="유저 프로필"
              width={120}
              height={120}
              unoptimized={avatarSrc.startsWith("data:") || checkAvatarApiSrcPrivate(avatarSrc)}
            />
          </div>
          <input type="hidden" {...register("avatar")} />
          <p className="text-center text-xs text-muted-foreground">
            {isPlaceholderAvatar
              ? "등록된 프로필 이미지가 없어 기본 이미지가 사용됩니다."
              : "마이페이지에 등록된 프로필 이미지를 사용합니다."}
          </p>
        </div>
        <div className="grid gap-6">
          <label className="flex flex-col gap-2 text-sm font-semibold text-muted-foreground">
            이름
            <input
              type="text"
              placeholder="예: Jamie"
              readOnly
              className={inputBaseStyle}
              {...register("display_name")}
            />
            <p className="text-xs text-muted-foreground">
              회원가입 시 이름을 입력하지 않으면, 이메일의 @ 앞부분이 이름으로 표시됩니다.
            </p>
          </label>
          {isCompanyPublic && (
            <label className="flex flex-col gap-2 text-sm font-semibold text-muted-foreground">
              회사명
              <input
                type="text"
                placeholder="회사명을 입력해주세요."
                className={inputBaseStyle}
                readOnly
                {...register("company_name")}
              />
              {errors.company_name ? (
                <p className="text-xs text-destructive">{errors.company_name?.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  회사명을 공개하려면 ‘회사명 공개’ 체크박스를 선택해주세요.
                </p>
              )}
            </label>
          )}

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              {...register("is_company_public", {
                onChange: (e) => {
                  const checked = e.target.checked;
                  if (!checked) {
                    clearErrors("company_name");
                  } else {
                    void trigger("company_name");
                  }
                },
              })}
            />
            회사명 공개
          </label>
        </div>
      </div>
    </section>
  );
}
