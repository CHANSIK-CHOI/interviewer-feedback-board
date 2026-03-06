export type ParseStatusQueryResult<T extends string> = {
  statuses: T[] | null;
  error: string | null;
};

type ParseStatusQueryParams<T extends string> = {
  rawStatus: string | string[] | undefined;
  allowedStatuses: readonly T[];
  defaultStatuses: readonly T[];
  usageMessage: string;
};

export const parseStatusQuery = <T extends string>({
  rawStatus,
  allowedStatuses,
  defaultStatuses,
  usageMessage,
}: ParseStatusQueryParams<T>): ParseStatusQueryResult<T> => {
  if (typeof rawStatus === "undefined") {
    return { statuses: [...defaultStatuses], error: null };
  }

  const parsed = (Array.isArray(rawStatus) ? rawStatus : [rawStatus])
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  if (parsed.length === 0) {
    return {
      statuses: null,
      error: `Invalid status query. ${usageMessage}`,
    };
  }

  const allowedStatusSet = new Set(allowedStatuses);
  const invalidStatuses = parsed.filter((status) => !allowedStatusSet.has(status as T));

  if (invalidStatuses.length > 0) {
    return {
      statuses: null,
      error: `Unsupported status: ${invalidStatuses.join(", ")}`,
    };
  }

  return {
    statuses: Array.from(new Set(parsed)) as T[],
    error: null,
  };
};
