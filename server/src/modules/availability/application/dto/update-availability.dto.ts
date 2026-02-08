import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { AvailabilityType } from '../../../../shared/domain/enums/availability-type.enum.js';

export class UpdateAvailabilityDto {
  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'timeFrom debe tener formato HH:mm',
  })
  @IsOptional()
  timeFrom?: string;

  @ApiPropertyOptional({ example: '15:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'timeTo debe tener formato HH:mm',
  })
  @IsOptional()
  timeTo?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({ enum: AvailabilityType })
  @IsEnum(AvailabilityType)
  @IsOptional()
  type?: AvailabilityType;

  @ApiPropertyOptional({ example: 'Cambio temporal' })
  @IsString()
  @IsOptional()
  reason?: string;
}
