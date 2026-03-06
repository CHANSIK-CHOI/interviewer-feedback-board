import type { SupabaseClient } from "@supabase/supabase-js";

type FreshAccessTokenParams = {
  supabaseClient: SupabaseClient | null;
  fallbackAccessToken: string | null;
};

export async function getFreshAccessToken({
  supabaseClient,
  fallbackAccessToken,
}: FreshAccessTokenParams): Promise<string | null> {
  if (!supabaseClient) {
    return fallbackAccessToken;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (!data || !data.session || !data.session.access_token || error) {
    console.error(error);
    return fallbackAccessToken;
  }

  return data.session.access_token;
}
