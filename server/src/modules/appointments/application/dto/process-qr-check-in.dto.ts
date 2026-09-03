import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ProcessQrCheckInDto {
  @ApiProperty({
    example: 'mc_qr_eyJhcHBvaW50bWVudElkIjo0Mn0.abcdef...',
    description: 'Token firmado del código QR del paciente',
  })
  @IsString()
  @IsNotEmpty({ message: 'El token QR es obligatorio' })
  qrToken: string;
}
