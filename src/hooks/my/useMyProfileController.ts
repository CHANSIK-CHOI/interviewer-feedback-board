import { useEffect, useState } from "react";
import type React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import { useSession } from "@/components/session";
import { useAlert } from "@/components/ui";
import { replaceSafely } from "@/lib/navigation/client";
import {
  AvatarUploadResult,
  uploadAvatarToSupabase,
  validateAvatarFile,
} from "@/lib/avatar/client";
import { AVATAR_PLACEHOLDER_SRC } from "@/constants";
import { getAuthProviders } from "@/lib/auth/provider";
import { getUserCompany, getUserName, getAvatarUrl } from "@/lib/user/profile";
import type { MyProfileForm } from "@/types/forms";

export const useMyProfileController = () => {
  const { openAlert } = useAlert();
  const { session, supabaseClient, isInitSessionComplete } = useSession();
  const router = useRouter();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<string | null>(null);

  const user = session?.user;
  const sessionUserName = getUserName(user);
  // const sessionPhone =
  //   typeof user?.user_metadata?.phone === "string" ? user.user_metadata.phone : "";
  const sessionAvatar = getAvatarUrl(user);
  const { sessionCompanyName, sessionIsCompanyPublic } = getUserCompany(user);
  const providers = getAuthProviders(user);

  const formMethods = useForm<MyProfileForm>({
    mode: "onSubmit",
    defaultValues: {
      company_name: sessionCompanyName,
      is_company_public: sessionIsCompanyPublic,
      name: sessionUserName,
      // phone: sessionPhone,
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
    void replaceSafely(router, "/login?next=/my");
  }, [isInitSessionComplete, router, session?.access_token]);

  useEffect(() => {
    reset({
      name: sessionUserName,
      // phone: sessionPhone,
      avatar: sessionAvatar,
      company_name: sessionCompanyName,
      is_company_public: sessionIsCompanyPublic,
    });
  }, [
    reset,
    sessionAvatar,
    // sessionPhone,
    sessionUserName,
    sessionCompanyName,
    sessionIsCompanyPublic,
  ]);

  useEffect(() => {
    return () => {
      if (pendingAvatarPreviewUrl) {
        URL.revokeObjectURL(pendingAvatarPreviewUrl);
      }
    };
  }, [pendingAvatarPreviewUrl]);

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
      void replaceSafely(router, "/login?next=/my");
      return;
    }

    try {
      validateAvatarFile(file);
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
    if (!supabaseClient || !session?.user || !session.access_token) return;

    const nextName = values.name.trim();
    // const nextPhone = values.phone.trim();
    let nextAvatar = values.avatar || AVATAR_PLACEHOLDER_SRC;
    const nextCompanyName = values.company_name.trim();
    const nextIsCompanyPublic = values.is_company_public;

    if (pendingAvatarFile) {
      setIsUploadingAvatar(true);
      try {
        const { avatarUrl }: AvatarUploadResult = await uploadAvatarToSupabase(
          pendingAvatarFile,
          session.access_token
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
        setIsUploadingAvatar(false);
      }
    }

    const { error } = await supabaseClient.auth.updateUser({
      data: {
        ...session.user.user_metadata,
        name: nextName,
        // phone: nextPhone,
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
        void replaceSafely(router, "/");
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
