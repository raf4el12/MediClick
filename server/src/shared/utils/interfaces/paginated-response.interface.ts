export interface PaginatedResponse<T> {
  totalRows: number;
  rows: T[];
  totalPages: number;
  currentPage: number;
}
