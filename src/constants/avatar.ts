import type { AvatarMimeType } from "@/types/avatar";

export const AVATAR_PLACEHOLDER_SRC = "https://placehold.co/100x100.png?text=Hello+World";
export const AVATAR_MAX_FILE_SIZE = 2 * 1024 * 1024;
export const AVATAR_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
] as const satisfies readonly AvatarMimeType[];
export const AVATAR_UPLOAD_ACCEPT = AVATAR_ALLOWED_MIME_TYPES.join(",");
