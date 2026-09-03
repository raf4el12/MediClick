import { ApiProperty } from '@nestjs/swagger';

export class AppointmentQrResponseDto {
  @ApiProperty({ example: 42, description: 'ID de la cita médica' })
  appointmentId: number;

  @ApiProperty({
    example: 'mc_qr_eyJ...hmac',
    description: 'Token criptográfico firmado (HMAC SHA-256) para auto-checkin',
  })
  qrToken: string;

  @ApiProperty({
    example: '2026-10-10T13:30:00.000Z',
    description: 'Instante UTC de apertura de la ventana de check-in (T-30m)',
  })
  opensAt: Date;

  @ApiProperty({
    example: '2026-10-10T14:15:00.000Z',
    description:
      'Instante UTC de cierre de la ventana y expiración del QR (T+15m)',
  })
  expiresAt: Date;
}
