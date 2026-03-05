import type { SupabaseClient } from "@supabase/supabase-js";

export type AvatarMimeType = "image/jpeg" | "image/png";

export type AvatarUploadResult = {
  avatarUrl: string;
  bucket: string;
  path: string;
};

export type AvatarUploadErrorResponse = {
  error: string;
};

export type AvatarUploadResponse = AvatarUploadResult | AvatarUploadErrorResponse;

export type ReplaceUserAvatarParams = {
  supabaseServer: SupabaseClient;
  bucket: string;
  userId: string;
  fileBuffer: Buffer;
  contentType: AvatarMimeType;
};

export type ReplaceUserAvatarResult = AvatarUploadResult;

export type RemoveUserAvatarParams = {
  supabaseServer: SupabaseClient;
  bucket: string;
  paths: string[];
};

export type AvatarRemoveResult = {
  isRemoveComplete: boolean;
};
