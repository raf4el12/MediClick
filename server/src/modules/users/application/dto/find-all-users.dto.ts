import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SortableBy } from '../../../../shared/utils/dtos/sortable-by.decorator.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';

export const USER_SORT_FIELDS = [
  'id',
  'name',
  'email',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

@SortableBy(USER_SORT_FIELDS)
export class FindAllUsersDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Filtrar usuarios por rol',
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol debe ser válido' })
  role?: UserRole;
}
