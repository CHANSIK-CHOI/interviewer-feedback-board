import type { SupabaseClient } from "@supabase/supabase-js";

type FreshAccessTokenParams = {
  supabaseBrowserClient: SupabaseClient | null;
  fallbackAccessToken: string | null;
};

export async function getFreshAccessToken({
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
