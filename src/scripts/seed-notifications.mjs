import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_RECIPIENT_USER_ID = "a493d164-bf2e-4395-8d9f-25053ef0b9e2";
const DEFAULT_ACTOR_USER_ID = "ad630131-be99-4270-b231-6301c1e26b86";
const DEFAULT_FEEDBACK_ID = "e9bc87e9-78a4-4c64-90d2-b886781840c6";
const DEFAULT_COMMENT_ID = "1b1da483-b98b-4eae-a314-6b546647c4e3";
const SEEDED_NOTIFICATION_TITLES = [
  "새 피드백 승인 요청",
  "피드백 재승인 요청",
  "피드백이 승인되었어요",
  "피드백이 반려되었어요",
  "관리자가 코멘트를 남겼어요",
  "내 코멘트에 답글이 달렸어요",
];

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Ignore missing .env.local
  }
}

function requireEnv(value, name) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

async function deleteExistingSeededNotifications({ supabase, recipientUserId, actorUserId }) {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("recipient_user_id", recipientUserId)
    .eq("actor_user_id", actorUserId)
    .in("title", SEEDED_NOTIFICATION_TITLES);

  if (error) throw error;
}

function buildNotificationRows({ recipientUserId, actorUserId, feedbackId, commentId }) {
  const feedbackLink = feedbackId ? `/feedback/${feedbackId}` : "/feedback";
  const commentLink = feedbackId
    ? commentId
      ? `/feedback/${feedbackId}?commentId=${commentId}`
      : `/feedback/${feedbackId}`
    : "/feedback";

  return [
    {
      recipient_user_id: recipientUserId,
      actor_user_id: actorUserId,
      feedback_id: feedbackId,
      comment_id: null,
      type: "feedback_submitted",
      title: "새 피드백 승인 요청",
      body: "테스트용으로 새 피드백 승인 요청 알림을 추가했습니다.",
      link: "/admin/feedback",
      is_read: false,
      metadata: {
        feedback_status: "pending",
      },
    },
    {
      recipient_user_id: recipientUserId,
      actor_user_id: actorUserId,
      feedback_id: feedbackId,
      comment_id: null,
      type: "feedback_resubmitted",
      title: "피드백 재승인 요청",
      body: "테스트용으로 재승인 요청 알림을 추가했습니다.",
      link: "/admin/feedback",
      is_read: false,
      metadata: {
        feedback_status: "revised_pending",
      },
    },
    {
      recipient_user_id: recipientUserId,
      actor_user_id: actorUserId,
      feedback_id: feedbackId,
      comment_id: null,
      type: "feedback_approved",
      title: "피드백이 승인되었어요",
      body: "테스트용으로 승인 알림을 추가했습니다.",
      link: feedbackLink,
      is_read: false,
      metadata: {
        feedback_status: "approved",
      },
    },
    {
      recipient_user_id: recipientUserId,
      actor_user_id: actorUserId,
      feedback_id: feedbackId,
      comment_id: null,
      type: "feedback_rejected",
      title: "피드백이 반려되었어요",
      body: "테스트용으로 반려 알림을 추가했습니다.",
      link: feedbackLink,
      is_read: true,
      metadata: {
        feedback_status: "rejected",
      },
    },
    {
      recipient_user_id: recipientUserId,
      actor_user_id: actorUserId,
      feedback_id: feedbackId,
      comment_id: commentId,
      type: "feedback_comment",
      title: "관리자가 코멘트를 남겼어요",
      body: "테스트용으로 코멘트 알림을 추가했습니다.",
      link: commentLink,
      is_read: false,
      metadata: {
        feedback_status: "approved",
      },
    },
    {
      recipient_user_id: recipientUserId,
      actor_user_id: actorUserId,
      feedback_id: feedbackId,
      comment_id: commentId,
      type: "feedback_reply",
      title: "내 코멘트에 답글이 달렸어요",
      body: "테스트용으로 답글 알림을 추가했습니다.",
      link: commentLink,
      is_read: true,
      metadata: {
        feedback_status: "approved",
        parent_comment_id: commentId,
      },
    },
  ];
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = requireEnv(process.env.SUPABASE_URL, "SUPABASE_URL");
  const serviceKey = requireEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
  const recipientUserId = process.env.SEED_NOTIFICATION_RECIPIENT_USER_ID ?? DEFAULT_RECIPIENT_USER_ID;
  const actorUserId = process.env.SEED_NOTIFICATION_ACTOR_USER_ID ?? DEFAULT_ACTOR_USER_ID;
  const feedbackId = process.env.SEED_NOTIFICATION_FEEDBACK_ID ?? DEFAULT_FEEDBACK_ID;
  const commentId = process.env.SEED_NOTIFICATION_COMMENT_ID ?? DEFAULT_COMMENT_ID;

  const supabase = createClient(supabaseUrl, serviceKey);
  await deleteExistingSeededNotifications({
    supabase,
    recipientUserId,
    actorUserId,
  });
  const rows = buildNotificationRows({
    recipientUserId,
    actorUserId,
    feedbackId,
    commentId,
  });

  const { data, error } = await supabase
    .from("notifications")
    .insert(rows)
    .select("id, type, title, is_read, created_at");
  if (error) throw error;

  console.log(`Inserted ${data?.length ?? 0} notifications`);
  console.table(data ?? []);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
