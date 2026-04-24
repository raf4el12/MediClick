import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNotificationDto {
  @ApiProperty({ example: 1, description: 'ID del usuario destino' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El userId es obligatorio' })
  userId: number;

  @ApiProperty({
    example: 'APPOINTMENT_CONFIRMED',
    enum: [
      'APPOINTMENT_REMINDER',
      'APPOINTMENT_CONFIRMED',
      'APPOINTMENT_CANCELLED',
      'APPOINTMENT_RESCHEDULED',
      'NEW_APPOINTMENT',
      'GENERAL',
    ],
  })
  @IsString()
  @IsNotEmpty({ message: 'El tipo es obligatorio' })
  type: string;

  @ApiPropertyOptional({
    example: 'IN_APP',
    enum: ['IN_APP', 'EMAIL', 'SMS', 'PUSH'],
  })
  @IsString()
  @IsOptional()
  channel?: string;

  @ApiProperty({
    example: 'Cita confirmada',
    description: 'Título de la notificación',
  })
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @ApiProperty({
    example:
      'Su cita con el Dr. García ha sido confirmada para el 15 de marzo a las 10:00 AM.',
    description: 'Contenido de la notificación',
  })
  @IsString()
  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  message: string;

  @ApiPropertyOptional({
    example: { appointmentId: 5, doctorId: 2 },
    description: 'Metadata adicional (JSON libre)',
  })
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ example: 1, description: 'ID de la sede (opcional)' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  clinicId?: number | null;
}
