import type { AvatarMimeType } from "@/types/avatar";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;

export const matchesBufferSignature = (buffer: Buffer, signature: readonly number[]) =>
  buffer.length >= signature.length && signature.every((byte, index) => buffer[index] === byte);

export const getDetectedAvatarMimeTypeFromBuffer = (buffer: Buffer): AvatarMimeType | null => {
  if (matchesBufferSignature(buffer, PNG_SIGNATURE)) return "image/png";
  if (matchesBufferSignature(buffer, JPEG_SIGNATURE)) return "image/jpeg";
  return null;
};
