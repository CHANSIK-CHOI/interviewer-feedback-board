import { z } from "zod";

const nullableStringSchema = z.string().nullable();

const feedbackStatusSchema = z.enum(["pending", "approved", "rejected", "revised_pending"]);
const reviewQueueFeedbackStatusSchema = z.enum(["pending", "rejected", "revised_pending"]);

const feedbackPublicBaseSchema = z.object({
  id: z.string(),
  author_id: z.string(),
  display_name: z.string(),
  company_name: nullableStringSchema,
  is_company_public: z.boolean(),
  avatar_url: nullableStringSchema,
  is_public: z.boolean(),
  revision_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  reviewed_at: nullableStringSchema,
  reviewed_by: nullableStringSchema,
  comments_unlocked_at: nullableStringSchema,
});

const feedbackListItemSchema = feedbackPublicBaseSchema.extend({
  status: feedbackStatusSchema,
  isPreview: z.boolean(),
  comment_count: z.number(),
  summary: z.string(),
  strengths: nullableStringSchema,
  questions: nullableStringSchema,
  suggestions: nullableStringSchema,
  rating: z.number(),
  tags: z.array(z.string()),
});

const reviewQueueFeedbackListItemSchema = feedbackPublicBaseSchema.extend({
  status: reviewQueueFeedbackStatusSchema,
  isPreview: z.literal(false),
  comment_count: z.number(),
  summary: z.string(),
  strengths: nullableStringSchema,
  questions: nullableStringSchema,
  suggestions: nullableStringSchema,
  rating: z.number(),
  tags: z.array(z.string()),
});

export const successDataSchema = z.object({
  success: z.literal(true),
});

export const idDataSchema = z.object({
  id: z.string(),
});

export const pendingCountDataSchema = z.object({
  count: z.number(),
});

export const avatarUploadDataSchema = z.object({
  avatarUrl: z.string(),
  bucket: z.string(),
  path: z.string(),
});

export const userRoleSyncDataSchema = z.object({
  role: z.enum(["admin", "reviewer"]),
  isNewUser: z.boolean(),
});

export const feedbackListDataSchema = z.array(feedbackListItemSchema);
export const reviewQueueFeedbackListDataSchema = z.array(reviewQueueFeedbackListItemSchema);

export const reviewFeedbackResultDataSchema = z.object({
  id: z.string(),
  status: feedbackStatusSchema,
  is_public: z.boolean(),
  reviewed_at: nullableStringSchema,
  reviewed_by: nullableStringSchema,
  reviewer_name: nullableStringSchema,
});

export const feedbackCommentDataSchema = z.object({
  id: z.string(),
  feedback_id: z.string(),
  parent_comment_id: nullableStringSchema,
  author_id: z.string(),
  author_name: z.string(),
  author_avatar_url: nullableStringSchema,
  body: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  edited_at: nullableStringSchema,
});

export const notificationTypeSchema = z.enum([
  "feedback_submitted",
  "feedback_resubmitted",
  "feedback_approved",
  "feedback_rejected",
  "feedback_comment",
  "feedback_reply",
]);

export const notificationItemDataSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string(),
  link: z.string(),
  is_read: z.boolean(),
  created_at: z.string(),
});

export const notificationItemDataOrNullSchema = notificationItemDataSchema.nullable();
