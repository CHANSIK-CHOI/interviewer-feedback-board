import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

function readFeedbacksFromFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const json = JSON.parse(content);
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  throw new Error("Invalid feedbacks JSON format");
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

async function resolveUserId({ supabase, userId, userEmail, label }) {
  if (userId) return userId;
  if (!userEmail) return null;

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  const users = data?.users ?? [];
  const matched = users.find((user) => user.email === userEmail);
  if (!matched) {
    throw new Error(`${label} user not found for email: ${userEmail}`);
  }
  return matched.id;
}

function buildRows({ items, authorId, reviewerId }) {
  const baseTime = Date.now();
  return items.map((item, index) => {
    const displayName = String(item.display_name ?? "").trim();
    const email = String(item.email ?? "").trim();
    const summary = String(item.summary ?? "").trim();
    const rating = Number(item.rating);

    if (!displayName) throw new Error("Missing display_name in feedback seed");
    if (!email) throw new Error("Missing email in feedback seed");
    if (!summary) throw new Error("Missing summary in feedback seed");
    if (!Number.isFinite(rating)) throw new Error("Missing rating in feedback seed");

    const status = item.status ?? "pending";
    const createdAt =
      item.created_at ?? new Date(baseTime - (items.length - index) * 1000).toISOString();
    const updatedAt = item.updated_at ?? createdAt;
    const isPublic =
      typeof item.is_public === "boolean" ? item.is_public : status === "approved";
    const revisionCount =
      typeof item.revision_count === "number"
        ? item.revision_count
        : status === "revised_pending"
          ? 1
          : 0;

    const isReviewRequired = ["approved", "rejected", "revised_pending"].includes(status);
    const reviewedAt =
      item.reviewed_at ??
      (isReviewRequired ? new Date(baseTime - index * 500).toISOString() : null);
    const reviewedBy = item.reviewed_by ?? (isReviewRequired ? reviewerId ?? null : null);
    const reviewQueueStatus =
      item.review_queue_status ??
      (status === "approved" || status === "rejected"
        ? revisionCount > 0
          ? "revised_pending"
          : "pending"
        : null);

    const resolvedAuthorId = item.author_id ?? authorId;
    if (!resolvedAuthorId) {
      throw new Error("Missing author_id. Set SEED_AUTHOR_ID or add author_id in JSON.");
    }

    return {
      author_id: resolvedAuthorId,
      display_name: displayName,
      company_name: item.company_name ?? null,
      is_company_public: Boolean(item.is_company_public),
      avatar_url: item.avatar_url ?? null,
      email,
      summary,
      strengths: item.strengths ?? null,
      questions: item.questions ?? null,
      suggestions: item.suggestions ?? null,
      rating,
      tags: normalizeTags(item.tags),
      status,
      is_public: isPublic,
      revision_count: revisionCount,
      created_at: createdAt,
      updated_at: updatedAt,
      reviewed_at: reviewedAt,
      reviewed_by: reviewedBy,
      review_queue_status: reviewQueueStatus,
    };
  });
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = requireEnv(process.env.SUPABASE_URL, "SUPABASE_URL");
  const serviceKey = requireEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceKey);

  const authorId = await resolveUserId({
    supabase,
    userId: process.env.SEED_AUTHOR_ID,
    label: "SEED_AUTHOR",
  });

  const reviewerId = await resolveUserId({
    supabase,
    userId: process.env.SEED_REVIEWER_ID,
    userEmail: process.env.SEED_REVIEWER_EMAIL,
    label: "SEED_REVIEWER",
  });

  const dataPath = resolve(process.cwd(), "src/mock/feedbacks.json");
  const items = readFeedbacksFromFile(dataPath);
  const rows = buildRows({ items, authorId, reviewerId });

  const { error: deleteError } = await supabase
    .from("feedbacks")
    .delete()
    .not("id", "is", null);
  if (deleteError) throw deleteError;

  const { error } = await supabase.from("feedbacks").insert(rows);
  if (error) throw error;

  console.log("feedback seed done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
