import { useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

type UseBrowserSessionResult = {
  session: Session | null;
  isInitSessionComplete: boolean;
};

export function useBrowserSession(
  supabaseBrowserClient: SupabaseClient | null
): UseBrowserSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitSessionComplete, setIsInitSessionComplete] = useState(false);

  useEffect(() => {
    if (!supabaseBrowserClient) {
      setIsInitSessionComplete(false);
      return;
    }

    let isMounted = true;

    supabaseBrowserClient.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
      setIsInitSessionComplete(true);
    });

    const { data: subscription } = supabaseBrowserClient.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setIsInitSessionComplete(true);
      }
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabaseBrowserClient]);

  return { session, isInitSessionComplete };
}
