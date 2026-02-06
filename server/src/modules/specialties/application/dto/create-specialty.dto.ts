import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSpecialtyDto {
  @ApiProperty({ example: 1, description: 'ID de la categoría' })
  @IsInt()
  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  categoryId: number;

  @ApiProperty({ example: 'Cardiología Pediátrica' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiPropertyOptional({ example: 'Especialidad en corazón infantil' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 30, description: 'Duración en minutos' })
  @IsInt()
  @Min(1, { message: 'La duración debe ser al menos 1 minuto' })
  @IsNotEmpty({ message: 'La duración es obligatoria' })
  duration: number;

  @ApiProperty({ example: 150.0, description: 'Precio de la consulta' })
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  @IsNotEmpty({ message: 'El precio es obligatorio' })
  price: number;

  @ApiPropertyOptional({ example: 'Traer exámenes previos' })
  @IsString()
  @IsOptional()
  requirements?: string;

  @ApiPropertyOptional({ example: 'cardio-icon' })
  @IsString()
  @IsOptional()
  icon?: string;
}
