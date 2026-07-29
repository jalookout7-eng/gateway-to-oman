// Pure client-side pagination maths for the admin leads table. Kept free of
// React so it is unit-testable without mounting anything (Notes: leads
// pagination). The page is fetched in full from the API and sliced here,
// so these helpers only ever operate on an in-memory array.

export const LEAD_PAGE_SIZES = [10, 25, 50, 100] as const;
export type LeadPageSize = (typeof LEAD_PAGE_SIZES)[number];
export const DEFAULT_LEAD_PAGE_SIZE: LeadPageSize = 25;

export interface PaginationResult<T> {
  pageItems: T[];
  totalPages: number;
  // 1-indexed, human-facing "Showing X to Y of Z". Both from and to are 0
  // when total is 0, so callers can render "Showing 0 to 0 of 0" directly.
  from: number;
  to: number;
  total: number;
  page: number;
}

// Clamp a requested page number into the valid [1, totalPages] range. A
// totalPages of 0 (empty list) clamps to 1, matching an empty page 1 rather
// than an undefined page 0.
export function clampPage(page: number, totalPages: number): number {
  const maxPage = Math.max(totalPages, 1);
  if (!Number.isFinite(page)) return 1;
  if (page < 1) return 1;
  if (page > maxPage) return maxPage;
  return Math.trunc(page);
}

// Slice `items` for the given page and page size, clamping the requested
// page into range first so an out-of-range page (e.g. after a filter
// shrinks the result set) never returns an empty slice by mistake.
export function paginate<T>(items: T[], page: number, pageSize: number): PaginationResult<T> {
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const clamped = clampPage(page, totalPages);

  if (total === 0) {
    return { pageItems: [], totalPages, from: 0, to: 0, total: 0, page: clamped };
  }

  const start = (clamped - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  return {
    pageItems: items.slice(start, end),
    totalPages,
    from: start + 1,
    to: end,
    total,
    page: clamped,
  };
}
