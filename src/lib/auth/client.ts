import type { SupabaseClient } from "@supabase/supabase-js";

type AccessTokenParams = {
  supabaseBrowserClient: SupabaseClient | null;
  fallbackAccessToken: string | null;
};

type GetClientAccessTokenOrThrowParams = AccessTokenParams & {
  errorMessage?: string;
};

export async function getClientAccessTokenOrThrow({
  supabaseBrowserClient,
  fallbackAccessToken,
  errorMessage = "로그인 상태를 확인해주세요.",
}: GetClientAccessTokenOrThrowParams): Promise<string> {
  let accessToken = fallbackAccessToken;

  if (supabaseBrowserClient) {
    const { data, error } = await supabaseBrowserClient.auth.getSession();
    if (!data || !data.session || !data.session.access_token || error) {
      console.error(error);
    } else {
      accessToken = data.session.access_token;
    }
  }

  if (!accessToken) {
    throw new Error(errorMessage);
  }

  return accessToken;
}
