import { z } from 'zod';

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export interface ParsedPagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePaginationQuery(query: unknown): ParsedPagination {
  const result = paginationQuerySchema.safeParse(query ?? {});
  const { page, pageSize } = result.success ? result.data : { page: 1, pageSize: 20 };

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
