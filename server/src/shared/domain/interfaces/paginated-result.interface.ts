export interface PaginatedResult<T> {
  totalRows: number;
  rows: T[];
  totalPages: number;
  currentPage: number;
}
