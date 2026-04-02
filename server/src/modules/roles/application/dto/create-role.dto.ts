import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Enfermero' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del rol es obligatorio' })
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'Rol para personal de enfermería' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  permissionIds?: number[];
}
