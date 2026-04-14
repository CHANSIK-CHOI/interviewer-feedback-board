import { FEEDBACK_FORM_ERROR_MESSAGES } from "@/constants";
import { z } from "zod";

const trimmedString = z.string().trim();

const commentBodySchema = trimmedString
  .min(1, "코멘트 내용을 입력해주세요.")
  .max(1000, "코멘트는 1000자 이하로 작성해주세요.");

export const feedbackCommentFormSchema = z.object({
  commentText: commentBodySchema,
});

export type FeedbackCommentsFormValues = z.infer<typeof feedbackCommentFormSchema>;

export const feedbackCommentComposerSchema = z.object({
  newCommentText: commentBodySchema,
});

export type FeedbackCommentsComposerValues = z.infer<typeof feedbackCommentComposerSchema>;

export const feedbackFormSchema = z
  .object({
    display_name: trimmedString.min(1, FEEDBACK_FORM_ERROR_MESSAGES.nameSummary),
    company_name: trimmedString,
    is_company_public: z.boolean(FEEDBACK_FORM_ERROR_MESSAGES.companyPublic),
    avatar: trimmedString,
    rating: z.coerce
      .number<number>()
      .int(FEEDBACK_FORM_ERROR_MESSAGES.rating)
      .min(1, FEEDBACK_FORM_ERROR_MESSAGES.rating)
      .max(5, FEEDBACK_FORM_ERROR_MESSAGES.rating),
    summary: trimmedString.min(1, "한줄평을 입력해주세요."),
    strengths: trimmedString,
    questions: trimmedString,
    suggestions: trimmedString,
    tags: z.array(z.string()).min(1, "키워드를 1개 이상 선택해주세요."),
  })
  .superRefine(({ company_name, is_company_public }, ctx) => {
    if (!is_company_public || company_name) return;

    ctx.addIssue({
      code: "custom",
      message: FEEDBACK_FORM_ERROR_MESSAGES.company,
      path: ["company_name"],
    });
  });
