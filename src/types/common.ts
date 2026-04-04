import { PostgrestError } from "@supabase/supabase-js";

export type SupabaseError = PostgrestError | null;

export type ApiSuccessResponse<T> = {
  data: T;
  error: null;
};

export type ApiErrorResponse = {
  data: null;
  error: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
