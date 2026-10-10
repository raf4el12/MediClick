import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const RESTRICTION_IMPACT_TYPES = [
  'FULL_DAY',
  'TIME_RANGE',
  'HOLIDAY',
] as const;
export type RestrictionImpactType = (typeof RESTRICTION_IMPACT_TYPES)[number];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class RestrictionImpactQueryDto {
  @ApiProperty({ enum: RESTRICTION_IMPACT_TYPES })
  @IsIn(RESTRICTION_IMPACT_TYPES)
  type: RestrictionImpactType;

  @ApiPropertyOptional({
    example: 12,
    description:
      'Obligatorio para FULL_DAY y TIME_RANGE; no se admite con HOLIDAY',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  doctorId?: number;

  @ApiPropertyOptional({
    example: 3,
    description:
      'Solo HOLIDAY. Para el personal con sede vale su sede y puede omitirlo; un administrador global lo omite para un feriado global',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clinicId?: number;

  @ApiProperty({
    example: '2026-10-21',
    description: 'Primer día local de la sede, inclusive',
  })
  @IsString()
  @Matches(DAY, { message: 'startDate debe tener formato YYYY-MM-DD' })
  startDate: string;

  @ApiProperty({
    example: '2026-10-23',
    description:
      'Último día local de la sede, inclusive; igual a startDate en HOLIDAY',
  })
  @IsString()
  @Matches(DAY, { message: 'endDate debe tener formato YYYY-MM-DD' })
  endDate: string;

  @ApiPropertyOptional({ example: '10:00', description: 'Solo TIME_RANGE' })
  @IsOptional()
  @Matches(TIME, { message: 'timeFrom debe tener formato HH:mm' })
  timeFrom?: string;

  @ApiPropertyOptional({ example: '12:00', description: 'Solo TIME_RANGE' })
  @IsOptional()
  @Matches(TIME, { message: 'timeTo debe tener formato HH:mm' })
  timeTo?: string;

  @ApiPropertyOptional({
    example: 7,
    description:
      'Al editar un bloqueo o feriado existente: su versión actual no se cuenta',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  excludeRestrictionId?: number;
}
