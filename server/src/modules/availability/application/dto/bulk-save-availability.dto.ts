import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Matches,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import { AvailabilityType } from '../../../../shared/domain/enums/availability-type.enum.js';

export class BulkSaveAvailabilityEntryDto {
  @ApiProperty({ example: '2026-03-01' })
  @IsDateString({}, { message: 'startDate debe ser una fecha válida' })
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString({}, { message: 'endDate debe ser una fecha válida' })
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MONDAY })
  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'timeFrom debe tener formato HH:mm' })
  @IsNotEmpty()
  timeFrom: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'timeTo debe tener formato HH:mm' })
  @IsNotEmpty()
  timeTo: string;

  @ApiProperty({ enum: AvailabilityType, example: AvailabilityType.REGULAR })
  @IsEnum(AvailabilityType)
  @IsNotEmpty()
  type: AvailabilityType;

  @ApiPropertyOptional({ example: 'Horario principal' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BulkSaveAvailabilityDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  doctorId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  specialtyId: number;

  @ApiProperty({ type: [BulkSaveAvailabilityEntryDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos una entrada' })
  @ValidateNested({ each: true })
  @Type(() => BulkSaveAvailabilityEntryDto)
  entries: BulkSaveAvailabilityEntryDto[];
}
