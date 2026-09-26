import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function paginationArgs(query: URLSearchParams) {
  return paginationSchema.parse({
    page: query.get("page") ?? undefined,
    pageSize: query.get("pageSize") ?? undefined,
  });
}

export function paginatedMeta(total: number, page: number, pageSize: number) {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
