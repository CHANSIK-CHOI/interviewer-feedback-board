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

export const toStrictNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized.length === 0) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};
