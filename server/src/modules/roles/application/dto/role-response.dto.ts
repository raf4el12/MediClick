import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionResponseDto } from '../../../permissions/application/dto/permission-response.dto.js';

export class RoleResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: 'ADMIN' })
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  isSystem: boolean;

  @ApiPropertyOptional()
  clinicId: number | null;

  @ApiProperty({ type: [PermissionResponseDto] })
  permissions: PermissionResponseDto[];

  @ApiProperty()
  createdAt: Date;
}
