const PRIVATE_AVATAR_API_PREFIX = "/api/avatar/";

export const buildAvatarDirectory = (userId: string) => `users/${userId}`;

export const buildAvatarPath = (userId: string) => `${buildAvatarDirectory(userId)}/avatar`;

export const buildAvatarProxyUrl = (userId: string) =>
  `${PRIVATE_AVATAR_API_PREFIX}${encodeURIComponent(userId)}?t=${Date.now()}`;

export const isSvgImageSrc = (src: string) => {
  try {
    return new URL(src).pathname.toLowerCase().endsWith(".svg");
  } catch {
    return src.toLowerCase().split("?")[0].endsWith(".svg");
  }
};

export const isPrivateAvatarApiSrc = (src: string) => {
  try {
    const parsedUrl = new URL(src, "http://localhost");
    return parsedUrl.pathname.startsWith(PRIVATE_AVATAR_API_PREFIX);
  } catch {
    return src.startsWith(PRIVATE_AVATAR_API_PREFIX);
  }
};
