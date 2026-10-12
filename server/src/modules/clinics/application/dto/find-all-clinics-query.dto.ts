import { SortableBy } from '../../../../shared/utils/dtos/sortable-by.decorator.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export const CLINIC_SORT_FIELDS = [
  'id',
  'name',
  'timezone',
  'currency',
  'phone',
  'email',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

@SortableBy(CLINIC_SORT_FIELDS)
export class FindAllClinicsQueryDto extends PaginationDto {}
