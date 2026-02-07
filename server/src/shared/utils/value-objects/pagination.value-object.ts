export class Pagination {
  constructor(
    public readonly searchValue?: string,
    public readonly currentPage: number = 1,
    public readonly pageSize: number = 10,
    public readonly orderBy?: string,
    public readonly orderByMode?: string,
    public readonly custom_value?: number,
    public readonly role_id?: number,
  ) {}
}
