import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Cardiología' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiPropertyOptional({ example: 'Especialidades del corazón' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'heart-icon' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ example: '#FF5733' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
