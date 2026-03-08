import React, { ReactNode } from "react";

type FeedbackStatCardProps = {
  label: string;
  value: ReactNode;
};

export default function FeedbackStatCard({ label, value }: FeedbackStatCardProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <strong className="mt-2 block text-2xl font-semibold text-foreground">{value}</strong>
    </div>
  );
}
