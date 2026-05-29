import { dateToTimeString } from '../../../../shared/utils/date-time.utils.js';
import type {
  WaitlistEntryWithRelations,
  WaitlistOfferWithEntry,
} from '../../domain/interfaces/waitlist-data.interface.js';
import {
  WaitlistEntryResponseDto,
  WaitlistOfferResponseDto,
} from './waitlist-response.dto.js';

export function toEntryDto(
  entry: WaitlistEntryWithRelations,
): WaitlistEntryResponseDto {
  return {
    id: entry.id,
    specialtyId: entry.specialtyId,
    specialtyName: entry.specialty.name,
    doctorId: entry.doctorId,
    doctorName: entry.doctor
      ? `${entry.doctor.profile.name} ${entry.doctor.profile.lastName}`
      : null,
    dateFrom: entry.dateFrom,
    dateTo: entry.dateTo,
    timePreference: entry.timePreference,
    priority: entry.priority,
    status: entry.status,
    waitUntil: entry.waitUntil,
    notes: entry.notes,
    createdAt: entry.createdAt,
  };
}

export function toOfferDto(
  offer: WaitlistOfferWithEntry,
): WaitlistOfferResponseDto {
  return {
    id: offer.id,
    waitlistEntryId: offer.waitlistEntryId,
    scheduleId: offer.scheduleId,
    specialtyName: offer.entry.specialty.name,
    startTime: dateToTimeString(offer.startTime),
    endTime: dateToTimeString(offer.endTime),
    expiresAt: offer.expiresAt,
    status: offer.status,
    secondsRemaining: Math.max(
      0,
      Math.floor((offer.expiresAt.getTime() - Date.now()) / 1000),
    ),
  };
}
