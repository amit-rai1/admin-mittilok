export const DEFAULT_PAGE_SIZE = 20;

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export type LocalPageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

/** Client-side filter + paginate for small admin CRUD lists. */
export function paginateLocal<T>(
  items: T[],
  page: number,
  pageSize: number,
  query: string,
  match: (item: T, q: string) => boolean,
): LocalPageResult<T> {
  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((item) => match(item, q)) : items;
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalCount,
  };
}

export function resultRange(page: number, pageSize: number, totalCount: number): string {
  if (totalCount <= 0) return "0 results";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  return `Showing ${from}–${to} of ${totalCount}`;
}
