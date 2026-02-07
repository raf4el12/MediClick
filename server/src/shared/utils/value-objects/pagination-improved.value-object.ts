import { Pagination } from './pagination.value-object';

export class PaginationImproved {
  constructor(
    public readonly searchValue?: string,
    public readonly currentPage: number = 1,
    public readonly pageSize: number = 10,
    public readonly orderBy?: string,
    public readonly orderByMode?: string,
    public readonly custom_value?: number,
  ) {}

  getOffsetLimit(): { limit: number; offset: number } {
    const limit = this.pageSize ? +this.pageSize : 10;
    const offset = this.currentPage >= 1 ? (this.currentPage - 1) * limit : 0;
    return { limit, offset };
  }

  formatResponse<T>(data: { rows: T[]; count: number }): {
    totalRows: number;
    rows: T[];
    totalPages: number;
    currentPage: number;
  } {
    const { limit } = this.getOffsetLimit();
    const { count: totalRows, rows } = data;
    const totalPages = Math.ceil(totalRows / limit);

    return {
      totalRows,
      rows,
      totalPages,
      currentPage: this.currentPage,
    };
  }

  getOrderBy(defaultField: string = 'id'): { [key: string]: string } {
    return {
      [this.orderBy || defaultField]: this.orderByMode || 'desc',
    };
  }

  hasSearch(): boolean {
    return !!this.searchValue && this.searchValue.trim().length > 0;
  }

  static fromPagination(pagination: Pagination): PaginationImproved {
    return new PaginationImproved(
      pagination.searchValue,
      pagination.currentPage,
      pagination.pageSize,
      pagination.orderBy,
      pagination.orderByMode,
      pagination.custom_value,
    );
  }
}
