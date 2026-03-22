import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui";
import { inputBaseStyle } from "@/constants";
import type { MyProfileForm } from "@/types/forms";

type MyProfileFormFieldsProps = {
  userEmail: string;
  isUploadingAvatar: boolean;
};

export default function MyProfileFormFields({
  userEmail,
  isUploadingAvatar,
}: MyProfileFormFieldsProps) {
  const {
    register,
    setValue,
    control,
    clearErrors,
    trigger,
    formState: { errors, isSubmitting },
  } = useFormContext<MyProfileForm>();

  const isCompanyPublic = useWatch({ control, name: "is_company_public" });

  return (
    <>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-muted-foreground" htmlFor="my_name">
          이름
        </label>
        <input
          id="my_name"
          type="text"
          className={inputBaseStyle}
          placeholder="이름을 입력해주세요."
          {...register("name", {
            required: "이름을 입력해주세요.",
            setValueAs: (value) => (typeof value === "string" ? value.trim() : value),
          })}
        />
        {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-muted-foreground" htmlFor="my_email">
          이메일
        </label>
        <input id="my_email" type="email" className={inputBaseStyle} value={userEmail} readOnly />
        <p className="text-xs text-muted-foreground">이메일은 관리자와 작성자에게만 표시됩니다.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label
          className="flex items-center gap-2 text-sm text-muted-foreground"
          htmlFor="my_company_name"
        >
          회사명 (선택)
        </label>
        <input
          id="my_company_name"
          type="text"
          className={inputBaseStyle}
          placeholder="회사명을 입력해주세요."
          disabled={!isCompanyPublic}
          {...register("company_name", {
            setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
            validate: (v) =>
              !isCompanyPublic ||
              (typeof v === "string" && v.trim().length > 0) ||
              "회사명을 입력해주세요",
          })}
        />
        {errors.company_name ? (
          <p className="text-xs text-destructive">{errors.company_name?.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            회사명을 공개하려면 ‘회사명 공개’ 체크박스를 선택해주세요.
          </p>
        )}

        <label
          htmlFor="my_company_public"
          className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <input
            id="my_company_public"
            type="checkbox"
            className="h-4 w-4 shrink-0 rounded border-border/60 accent-primary"
            {...register("is_company_public", {
              onChange: (e) => {
                const checked = e.target.checked;
                if (!checked) {
                  setValue("company_name", "", { shouldDirty: true });
                  clearErrors("company_name");
                } else {
                  void trigger("company_name");
                }
              },
            })}
          />
          <span>회사명 공개</span>
        </label>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={isSubmitting || isUploadingAvatar}>
          내 정보 수정하기
        </Button>
      </div>
    </>
  );
}
