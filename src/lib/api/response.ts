import type { ApiResponse } from "@/types/common";
import { z } from "zod";

const apiResponsePayloadSchema = z.object({
  data: z.unknown(),
  error: z.string().nullable(),
});

export async function parseApiResponse<TDataSchema extends z.ZodType>(
  response: Response,
  dataSchema: TDataSchema,
  invalidResponseMessage = "Invalid response"
): Promise<ApiResponse<z.infer<TDataSchema>>> {
  const payload: unknown = await response.json().catch(() => null);
  const result = apiResponsePayloadSchema.safeParse(payload);

  if (!result.success) {
    return {
      data: null,
      error: invalidResponseMessage,
    };
  }

  if (result.data.error !== null) {
    return {
      data: null,
      error: result.data.error,
    };
  }

  const dataResult = dataSchema.safeParse(result.data.data);
  if (!dataResult.success) {
    return {
      data: null,
      error: invalidResponseMessage,
    };
  }

  return {
    data: dataResult.data,
    error: null,
  };
}
