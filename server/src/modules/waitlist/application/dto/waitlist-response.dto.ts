import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WaitlistTimePreference } from '../../domain/enums/waitlist-time-preference.enum.js';
import { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';
import { WaitlistOfferStatus } from '../../domain/enums/waitlist-offer-status.enum.js';

export class WaitlistEntryResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() patientId: number;
  @ApiProperty() patientName: string;
  @ApiProperty() specialtyId: number;
  @ApiProperty() specialtyName: string;
  @ApiPropertyOptional({ nullable: true }) doctorId: number | null;
  @ApiPropertyOptional({ nullable: true }) doctorName: string | null;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Sede donde se buscan cupos',
  })
  clinicName: string | null;
  @ApiProperty() dateFrom: Date;
  @ApiProperty() dateTo: Date;
  @ApiProperty({ enum: WaitlistTimePreference })
  timePreference: WaitlistTimePreference;
  @ApiProperty() priority: number;
  @ApiProperty({ enum: WaitlistEntryStatus }) status: WaitlistEntryStatus;
  @ApiPropertyOptional({ nullable: true }) waitUntil: Date | null;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiProperty() createdAt: Date;
}

export class WaitlistOfferClinicDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty({ example: 'America/Lima' }) timezone: string;
}

export class WaitlistOfferResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() waitlistEntryId: number;
  @ApiProperty() scheduleId: number;
  @ApiProperty() specialtyName: string;
  @ApiProperty({
    example: '2026-10-22',
    description: 'Día del cupo ofrecido (agenda de la sede)',
  })
  scheduleDate: string;
  @ApiProperty({ example: 'Lucía Paredes' }) doctorName: string;
  @ApiPropertyOptional({
    type: WaitlistOfferClinicDto,
    nullable: true,
  })
  clinic: WaitlistOfferClinicDto | null;
  @ApiProperty({ example: '09:00', description: 'Hora local de la sede' })
  startTime: string;
  @ApiProperty() endTime: string;
  @ApiProperty() expiresAt: Date;
  @ApiProperty({ enum: WaitlistOfferStatus }) status: WaitlistOfferStatus;
  @ApiProperty({
    description: 'Segundos restantes antes de que expire la oferta',
  })
  secondsRemaining: number;
}
