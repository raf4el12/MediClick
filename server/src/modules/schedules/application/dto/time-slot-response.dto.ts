import { ApiProperty } from '@nestjs/swagger';

/**
 * Representa un intervalo de tiempo disponible o no para agendar citas.
 */
export class TimeSlotResponseDto {
  @ApiProperty({ example: '08:00', description: 'Hora de inicio del slot (HH:mm)' })
  startTime: string;

  @ApiProperty({ example: '08:20', description: 'Hora de fin del slot (HH:mm)' })
  endTime: string;

  @ApiProperty({
    example: true,
    description: 'true si el slot está disponible para agendar, false si ya tiene una cita activa',
  })
  available: boolean;
}
