import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ProcessQrCheckInDto {
  @ApiProperty({
    example: 'mc_qr_eyJhcHBvaW50bWVudElkIjo0Mn0.abcdef...',
    description: 'Token firmado del código QR del paciente',
  })
  @IsString()
  @IsNotEmpty({ message: 'El token QR es obligatorio' })
  qrToken: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID de la sede donde se encuentra el kiosco/tótem de escaneo',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  kioskClinicId?: number;
}
