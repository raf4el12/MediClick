/**
 * Núcleo del flujo de reserva (§5.1 del SDD de la migración): estado, pasos,
 * invalidación en cascada y armado del comando, sin React ni servicios.
 */

export type BookingMode = 'online' | 'administrative';

export type BookingStep = 'clinic' | 'specialty' | 'doctor' | 'slot' | 'patient' | 'review';

/** Dato que hace falta para confirmar, en el orden de los pasos. */
export type BookingField = 'clinic' | 'specialty' | 'doctor' | 'date' | 'slot' | 'patient';

/**
 * Opción elegible de un catálogo. `meta` según el campo:
 * sede `{ currency, timezone }`, especialidad `{ price }` (en la moneda de la sede),
 * médico `{ clinicId, specialtyIds, clinicName, currency }`.
 */
export type BookingOption = { id: number; label: string; meta?: Record<string, unknown> };

export type SlotOption = { scheduleId: number; startTime: string; endTime: string; available: boolean };

export type BookingPreset = { clinicId?: number; specialtyId?: number; doctorId?: number };

export type BookingNotice = 'slot-taken' | 'no-slots';

export type BookingEvent =
  | { type: 'select'; field: 'clinic' | 'specialty' | 'doctor' | 'patient'; option: BookingOption }
  | { type: 'selectDay'; date: string }
  | { type: 'selectSlot'; slot: SlotOption }
  | { type: 'availableDaysLoaded'; timezone: string; days: string[] }
  | { type: 'presetResolved'; clinic?: BookingOption; specialty?: BookingOption; doctor?: BookingOption }
  | { type: 'setReason'; reason: string }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'slotTaken' }
  | { type: 'reset' };

export type BookingState = {
  mode: BookingMode;
  step: BookingStep;
  /** Sede del personal en modo administrativo; no se elige ni se invalida. */
  fixedClinic?: BookingOption;
  /** Ids preestablecidos (p. ej. desde el perfil del médico) pendientes de resolver. */
  preset?: BookingPreset;
  clinic?: BookingOption;
  specialty?: BookingOption;
  doctor?: BookingOption;
  patient?: BookingOption;
  date?: string;
  slot?: SlotOption;
  timezone?: string;
  availableDays?: string[];
  reason: string;
  notice?: BookingNotice;
};

export type BookingSummary = {
  clinic?: string;
  specialty?: string;
  doctor?: string;
  patient?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  price?: number;
  currency?: string;
};

export type BookingView = {
  steps: BookingStep[];
  activeStep: BookingStep;
  /** El paso activo está completo y `next` avanza. */
  canAdvance: boolean;
  missing: BookingField[];
  notice?: BookingNotice;
  summary: BookingSummary;
};

type SlotCommand = { scheduleId: number; startTime: string; endTime: string; reason?: string };

export type BookingCommand =
  | ({ mode: 'online' } & SlotCommand)
  | ({ mode: 'administrative'; patientId: number } & SlotCommand);
