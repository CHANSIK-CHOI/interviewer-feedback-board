export const toTrimmedString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const toNullableTrimmedString = (value: unknown) => {
  const normalized = toTrimmedString(value);
  return normalized.length > 0 ? normalized : null;
};

export const toStrictBoolean = (value: unknown): boolean | null => {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};
