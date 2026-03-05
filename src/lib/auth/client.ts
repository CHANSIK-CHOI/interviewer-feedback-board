import type { SupabaseClient } from "@supabase/supabase-js";

type GetFreshAccessTokenParams = {
  supabaseClient: SupabaseClient | null;
  fallbackAccessToken: string | null;
};

export async function getFreshAccessToken({
  supabaseClient,
  fallbackAccessToken,
}: GetFreshAccessTokenParams): Promise<string | null> {
  if (!supabaseClient) {
    return fallbackAccessToken;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error(error);
    return fallbackAccessToken;
  }

  return data.session?.access_token ?? fallbackAccessToken;
}
