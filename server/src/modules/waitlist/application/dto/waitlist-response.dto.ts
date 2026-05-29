import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WaitlistTimePreference } from '../../domain/enums/waitlist-time-preference.enum.js';
import { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';
import { WaitlistOfferStatus } from '../../domain/enums/waitlist-offer-status.enum.js';

export class WaitlistEntryResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() specialtyId: number;
  @ApiProperty() specialtyName: string;
  @ApiPropertyOptional({ nullable: true }) doctorId: number | null;
  @ApiPropertyOptional({ nullable: true }) doctorName: string | null;
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

export class WaitlistOfferResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() waitlistEntryId: number;
  @ApiProperty() scheduleId: number;
  @ApiProperty() specialtyName: string;
  @ApiProperty() startTime: string;
  @ApiProperty() endTime: string;
  @ApiProperty() expiresAt: Date;
  @ApiProperty({ enum: WaitlistOfferStatus }) status: WaitlistOfferStatus;
  @ApiProperty({ description: 'Segundos restantes antes de que expire la oferta' })
  secondsRemaining: number;
}
