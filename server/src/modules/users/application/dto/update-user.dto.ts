import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Juan' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: '999888777' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'DNI' })
  @IsString()
  @IsOptional()
  typeDocument?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @IsString()
  @IsOptional()
  numberDocument?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    enum: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST],
    example: UserRole.DOCTOR,
  })
  @IsEnum([UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST], {
    message: 'El rol debe ser ADMIN, DOCTOR o RECEPTIONIST',
  })
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ type: UpdateProfileDto })
  @ValidateNested()
  @Type(() => UpdateProfileDto)
  @IsOptional()
  profile?: UpdateProfileDto;
}
