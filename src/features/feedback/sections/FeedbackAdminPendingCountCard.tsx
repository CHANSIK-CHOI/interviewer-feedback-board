import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pendingCountQueryOptions } from "@/features/feedback/queries";
import FeedbackStatCard from "./FeedbackStatCard";

type FeedbackAdminPendingCountCardProps = {
  supabaseClient: SupabaseClient | null;
  fallbackAccessToken: string;
  viewerId: string;
};

export default function FeedbackAdminPendingCountCard({
  supabaseClient,
  fallbackAccessToken,
  viewerId,
}: FeedbackAdminPendingCountCardProps) {
  const { data: pendingCount } = useSuspenseQuery(
    pendingCountQueryOptions({
      viewerId,
      supabaseClient,
      fallbackAccessToken,
    })
  );

  return <FeedbackStatCard label="승인 대기" value={pendingCount} />;
}
