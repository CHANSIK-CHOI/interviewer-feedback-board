import type { SupabaseClient } from "@supabase/supabase-js";

type FreshAccessTokenParams = {
  supabaseBrowserClient: SupabaseClient | null;
  fallbackAccessToken: string | null;
};

type ResolveAccessTokenParams = FreshAccessTokenParams & {
  errorMessage?: string;
};

async function getFreshAccessToken({
  supabaseBrowserClient,
  fallbackAccessToken,
}: FreshAccessTokenParams): Promise<string | null> {
  if (!supabaseBrowserClient) {
    return fallbackAccessToken;
  }

  const { data, error } = await supabaseBrowserClient.auth.getSession();
  if (!data || !data.session || !data.session.access_token || error) {
    console.error(error);
    return fallbackAccessToken;
  }

  return data.session.access_token;
}

export async function resolveAccessToken({
  supabaseBrowserClient,
  fallbackAccessToken,
  errorMessage = "로그인 상태를 확인해주세요.",
}: ResolveAccessTokenParams): Promise<string> {
  const accessToken = await getFreshAccessToken({
    supabaseBrowserClient,
    fallbackAccessToken,
  });

  if (!accessToken) {
    throw new Error(errorMessage);
  }

  return accessToken;
}
