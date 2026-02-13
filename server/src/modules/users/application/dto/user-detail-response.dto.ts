import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';

export class UserProfileResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone: string | null;

  @ApiPropertyOptional()
  typeDocument: string | null;

  @ApiPropertyOptional()
  numberDocument: string | null;
}

export class UserDetailResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  updatedAt: Date | null;

  @ApiPropertyOptional({ type: UserProfileResponseDto })
  profile: UserProfileResponseDto | null;
}

export class PaginatedUserResponseDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty({ type: [UserDetailResponseDto] })
  rows: UserDetailResponseDto[];

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;
}
