import type React from "react";
import Image from "next/image";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui";
import { AVATAR_PLACEHOLDER_SRC, AVATAR_UPLOAD_ACCEPT } from "@/constants";
import { isPrivateAvatarApiSrc } from "@/lib/avatar/path";
import { getAuthProviderLabel } from "@/lib/auth/provider";
import type { MyProfileForm } from "@/types/forms";

type MyProfileAvatarPanelProps = {
  sessionAvatar: string;
  sessionUserName: string;
  userEmail: string;
  providers: string[];
  isUploadingAvatar: boolean;
  onChangeImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onResetImage: () => void;
};

export default function MyProfileAvatarPanel({
  sessionAvatar,
  sessionUserName,
  userEmail,
  providers,
  isUploadingAvatar,
  onChangeImage,
  onRemoveImage,
  onResetImage,
}: MyProfileAvatarPanelProps) {
  const {
    register,
    control,
    formState: { isSubmitting },
  } = useFormContext<MyProfileForm>();

  const avatarValue = useWatch({ control, name: "avatar" });
  const avatarSrc = avatarValue || AVATAR_PLACEHOLDER_SRC;
  const isAvatarConfigured = avatarSrc !== AVATAR_PLACEHOLDER_SRC;

  return (
    <div className="grid gap-5 md:grid-cols-[140px_1fr] md:items-start">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted text-sm text-muted-foreground">
          <Image
            className="h-full w-full object-cover"
            src={avatarSrc}
            alt="사용자 아바타"
            width={120}
            height={120}
            unoptimized={
              avatarSrc.startsWith("data:") ||
              avatarSrc.startsWith("blob:") ||
              isPrivateAvatarApiSrc(avatarSrc)
            }
          />
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button asChild variant="outline" size="sm" className="w-full cursor-pointer">
            <label htmlFor="myAvatarUpload">
              {isUploadingAvatar
                ? "업로드 중..."
                : isAvatarConfigured
                  ? "프로필 변경"
                  : "프로필 업로드"}
            </label>
          </Button>
          <input
            id="myAvatarUpload"
            type="file"
            accept={AVATAR_UPLOAD_ACCEPT}
            className="sr-only"
            disabled={isSubmitting || isUploadingAvatar}
            onChange={onChangeImage}
          />
          <input type="hidden" {...register("avatar")} />
          {isAvatarConfigured && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={isUploadingAvatar}
              onClick={onRemoveImage}
            >
              프로필 삭제
            </Button>
          )}
          {sessionAvatar !== AVATAR_PLACEHOLDER_SRC && sessionAvatar !== avatarSrc && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={isUploadingAvatar}
              onClick={onResetImage}
            >
              프로필 초기화
            </Button>
          )}
          <p className="text-center text-xs text-muted-foreground">JPG/PNG (SVG 불가), 2MB 이하</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{sessionUserName}</p>
        <p className="text-sm text-muted-foreground">{userEmail}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {providers.map((provider) => (
            <span
              key={provider}
              className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {getAuthProviderLabel(provider)} 로그인
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
