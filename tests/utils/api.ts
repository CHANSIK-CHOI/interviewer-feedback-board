import type { APIResponse } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ApiResponse } from "@/types/common";
import type { NotificationRow } from "@/types/notification";
import { loadTestEnv } from "./env";
import type { TestAccount } from "./accounts";

export type TestSession = {
  userId: string;
  accessToken: string;
};

export type NotificationLookup = {
  recipientUserId: NotificationRow["recipient_user_id"];
  feedbackId: NonNullable<NotificationRow["feedback_id"]>;
  type: NotificationRow["type"];
  commentId?: NotificationRow["comment_id"];
};

export function createSupabaseTestClient() {
  loadTestEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 없습니다.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createSupabaseServiceTestClient() {
  loadTestEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function signInTestUser(
  supabaseClient: SupabaseClient,
  account: TestAccount
): Promise<TestSession> {
  const { data, error } = await supabaseClient.auth.signInWithPassword(account);

  if (error || !data.session || !data.user) {
    throw new Error(error?.message ?? "테스트 계정 로그인에 실패했습니다.");
  }

  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
  };
}

export async function readApiData<T>(response: APIResponse): Promise<T> {
  const result = (await response.json().catch(() => ({
    data: null,
    error: "Invalid JSON response",
  }))) as ApiResponse<T>;

  if (!response.ok() || result.error !== null || result.data === null) {
    throw new Error(`${response.url()} failed: ${response.status()} ${result.error ?? ""}`.trim());
  }

  return result.data;
}

export async function waitForNotification(
  supabaseClient: SupabaseClient,
  lookup: NotificationLookup
) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let query = supabaseClient
      .from("notifications")
      .select("id, type, recipient_user_id, actor_user_id, feedback_id, comment_id, link, is_read")
      .eq("recipient_user_id", lookup.recipientUserId)
      .eq("feedback_id", lookup.feedbackId)
      .eq("type", lookup.type)
      .order("created_at", { ascending: false })
      .limit(5);

    if (lookup.commentId) {
      query = query.eq("comment_id", lookup.commentId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    if (data && data.length > 0) {
      return data[0];
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`${lookup.type} 알림을 찾지 못했습니다.`);
}

export async function countNotificationsByFeedback(
  supabaseClient: SupabaseClient,
  feedbackId: NonNullable<NotificationRow["feedback_id"]>
) {
  const { count, error } = await supabaseClient
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("feedback_id", feedbackId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}
