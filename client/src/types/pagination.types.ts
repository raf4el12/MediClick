export interface PaginationParams {
  searchValue?: string;
  currentPage?: number;
  pageSize?: number;
  orderBy?: string;
  orderByMode?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  totalRows: number;
  rows: T[];
  totalPages: number;
  currentPage: number;
}
