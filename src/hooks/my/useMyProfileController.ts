import { useEffect, useState } from "react";
import type React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import { useBoolean, useUnmount } from "usehooks-ts";
import { useSession } from "@/components/session";
import { useAlert } from "@/components/ui";
import { buildLoginHref, replaceSafely } from "@/lib/navigation/client";
import {
  AvatarUploadResult,
  uploadAvatarToSupabase,
  assertValidAvatarFile,
} from "@/lib/avatar/client";
import { AVATAR_PLACEHOLDER_SRC } from "@/constants";
import { getAuthProviders } from "@/lib/auth/provider";
import { getUserCompany, getUserName, getAvatarUrl } from "@/lib/user/profile";
import { myProfileFormSchema } from "@/lib/forms/my";
import type { MyProfileForm } from "@/types/forms";

export const useMyProfileController = () => {
  const { openAlert } = useAlert();
  const { session, supabaseBrowserClient, isInitSessionComplete, getAccessTokenOrThrow } =
    useSession();
  const router = useRouter();
  const {
    value: isUploadingAvatar,
    setFalse: stopUploadingAvatar,
    setTrue: startUploadingAvatar,
  } = useBoolean(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<string | null>(null);

  const user = session?.user;
  const sessionUserName = getUserName(user);
  const sessionAvatar = getAvatarUrl(user);
  const { sessionCompanyName, sessionIsCompanyPublic } = getUserCompany(user);
  const providers = getAuthProviders(user);

  const formMethods = useForm<MyProfileForm>({
    mode: "onSubmit",
    resolver: zodResolver(myProfileFormSchema),
    defaultValues: {
      company_name: sessionCompanyName,
      is_company_public: sessionIsCompanyPublic,
      name: sessionUserName,
      avatar: sessionAvatar,
    },
  });
  const {
    setValue,
    reset,
    formState: { isSubmitting },
  } = formMethods;

  useEffect(() => {
    if (!isInitSessionComplete) return;
    if (session?.access_token) return;
    void replaceSafely(router, buildLoginHref("/my"));
  }, [isInitSessionComplete, router, session?.access_token]);

  useEffect(() => {
    reset({
      name: sessionUserName,
      avatar: sessionAvatar,
      company_name: sessionCompanyName,
      is_company_public: sessionIsCompanyPublic,
    });
  }, [reset, sessionAvatar, sessionUserName, sessionCompanyName, sessionIsCompanyPublic]);

  useUnmount(() => {
    if (pendingAvatarPreviewUrl) {
      URL.revokeObjectURL(pendingAvatarPreviewUrl);
    }
  });

  const clearPendingAvatar = () => {
    setPendingAvatarFile(null);
    setPendingAvatarPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const onChangeImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (!session?.access_token) {
      event.target.value = "";
      void replaceSafely(router, buildLoginHref("/my"));
      return;
    }

    try {
      assertValidAvatarFile(file);
    } catch (error) {
      openAlert({
        description: error instanceof Error ? error.message : "아바타 업로드에 실패했습니다.",
      });
      event.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingAvatarFile(file);
    setPendingAvatarPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return previewUrl;
    });
    setValue("avatar", previewUrl, {
      shouldDirty: true,
      shouldValidate: true,
    });
    event.target.value = "";
  };

  const onRemoveImage = () => {
    clearPendingAvatar();
    setValue("avatar", AVATAR_PLACEHOLDER_SRC, { shouldDirty: true, shouldValidate: true });
  };

  const onResetImage = () => {
    clearPendingAvatar();
    setValue("avatar", sessionAvatar, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (values: MyProfileForm) => {
    if (isSubmitting) return;
    if (!supabaseBrowserClient || !session?.user) return;

    const nextName = values.name;
    let nextAvatar = values.avatar || AVATAR_PLACEHOLDER_SRC;
    const nextCompanyName = values.company_name;
    const nextIsCompanyPublic = values.is_company_public;

    if (pendingAvatarFile) {
      startUploadingAvatar();
      try {
        const accessToken = await getAccessTokenOrThrow();
        const { avatarUrl }: AvatarUploadResult = await uploadAvatarToSupabase(
          pendingAvatarFile,
          accessToken
        );

        nextAvatar = avatarUrl || AVATAR_PLACEHOLDER_SRC;
        clearPendingAvatar();
        setValue("avatar", nextAvatar, { shouldDirty: true, shouldValidate: true });
      } catch (error) {
        openAlert({
          description: error instanceof Error ? error.message : "아바타 업로드에 실패했습니다.",
        });
        return;
      } finally {
        stopUploadingAvatar();
      }
    }

    const { error } = await supabaseBrowserClient.auth.updateUser({
      data: {
        ...session.user.user_metadata,
        name: nextName,
        avatar_url: nextAvatar,
        company_name: nextCompanyName,
        is_company_public: nextIsCompanyPublic,
      },
    });

    if (error) {
      openAlert({
        description: "내 정보 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
      });
      return;
    }

    openAlert({
      description: "내 정보가 저장되었습니다.",
      onOk: () => {
        replaceSafely(router, "/");
      },
    });
  };

  return {
    formMethods,
    isLoading: !isInitSessionComplete || !user,
    viewModel: {
      sessionAvatar,
      sessionUserName,
      userEmail: user?.email ?? "",
      providers,
      isUploadingAvatar,
    },
    actions: {
      onChangeImage,
      onRemoveImage,
      onResetImage,
      onSubmit,
    },
  };
};
