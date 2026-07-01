import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @ApiProperty({
    example: 1,
    description: 'ID de la cita (debe estar COMPLETED y ser del paciente)',
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El appointmentId es obligatorio' })
  appointmentId: number;

  @ApiProperty({ example: 5, description: 'Calificación de 1 a 5' })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La calificación mínima es 1' })
  @Max(5, { message: 'La calificación máxima es 5' })
  rating: number;

  @ApiPropertyOptional({
    example: 'Excelente atención, muy puntual',
    description: 'Comentario',
  })
  @IsString()
  @MaxLength(1000, { message: 'El comentario no debe exceder 1000 caracteres' })
  @IsOptional()
  comment?: string;
}
