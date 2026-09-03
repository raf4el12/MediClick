import { ApiProperty } from '@nestjs/swagger';

export class CheckInTicketResponseDto {
  @ApiProperty({ example: 42 })
  appointmentId: number;

  @ApiProperty({
    example: 'T-42',
    description: 'Código de llamado o turno impreso en pantalla de sala',
  })
  turnCode: string;

  @ApiProperty({ example: 'Carlos Santana' })
  patientName: string;

  @ApiProperty({ example: 'Dr. Gregory House' })
  doctorName: string;

  @ApiProperty({ example: 'Cardiología' })
  specialtyName: string;

  @ApiProperty({ example: 'IN_PROGRESS' })
  status: string;

  @ApiProperty({ example: '2026-10-15T09:55:00.000Z' })
  checkedInAt: Date;
}
