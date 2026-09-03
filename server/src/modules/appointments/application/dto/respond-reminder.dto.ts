import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondReminderDto {
  @ApiProperty({
    description: 'Token firmado HMAC-SHA256 del recordatorio de cita',
    example: 'eyJhbGciOiJIUzI1NiJ9.signature',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
