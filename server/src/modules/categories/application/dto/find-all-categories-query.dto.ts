import { SortableBy } from '../../../../shared/utils/dtos/sortable-by.decorator.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export const CATEGORY_SORT_FIELDS = [
  'id',
  'name',
  'order',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

@SortableBy(CATEGORY_SORT_FIELDS)
export class FindAllCategoriesQueryDto extends PaginationDto {}
