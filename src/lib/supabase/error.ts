import type { SupabaseError } from "@/types/common";

export const resolveSupabaseErrorMessage = (error: SupabaseError, fallbackMessage: string) => {
  const message = error?.message?.trim();
  return message ? `${fallbackMessage}: ${message}` : fallbackMessage;
};
