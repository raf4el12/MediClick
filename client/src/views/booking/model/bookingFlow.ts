/**
 * Flujo de reserva en sus dos modos (§5.1): `initialBooking` y `bookingReducer`
 * llevan el estado, `describeBooking` lo traduce para las pantallas y
 * `toBookingCommand` arma la petición de creación.
 */
import type {
  BookingCommand,
  BookingEvent,
  BookingField,
  BookingMode,
  BookingOption,
  BookingPreset,
  BookingState,
  BookingStep,
  BookingSummary,
  BookingView,
} from './types';

// Mismo límite que `@MaxLength(500)` de los DTO de creación de cita.
export const MAX_REASON_LENGTH = 500;

const STEPS: Record<BookingMode, BookingStep[]> = {
  online: ['clinic', 'specialty', 'doctor', 'slot', 'review'],
  // UI-06: el personal empieza por el paciente; la sede es la suya.
  administrative: ['patient', 'specialty', 'doctor', 'slot', 'review'],
};

/** `fixedClinic`: sede del personal en modo administrativo. */
export function initialBooking(mode: BookingMode, preset?: BookingPreset, fixedClinic?: BookingOption): BookingState {
  return { mode, step: STEPS[mode][0]!, reason: '', ...(mode === 'administrative' && { fixedClinic }), ...(preset && { preset }) };
}

// Datos que completa cada paso; `review` no pide nada propio.
const STEP_FIELDS: Record<BookingStep, BookingField[]> = {
  clinic: ['clinic'],
  specialty: ['specialty'],
  doctor: ['doctor'],
  slot: ['date', 'slot'],
  patient: ['patient'],
  review: [],
};

const isMissing = (state: BookingState, field: BookingField) => state[field] === undefined;

function missingFields(state: BookingState): BookingField[] {
  return STEPS[state.mode].flatMap((step) => STEP_FIELDS[step]).filter((field) => isMissing(state, field));
}

const stepComplete = (state: BookingState, step: BookingStep) => STEP_FIELDS[step].every((f) => !isMissing(state, f));

const clinicOf = (state: BookingState) => (state.mode === 'administrative' ? state.fixedClinic : state.clinic);

const attends = (doctor: BookingOption | undefined, specialtyId: number) =>
  ((doctor?.meta?.specialtyIds as number[] | undefined) ?? []).includes(specialtyId);

const firstIncompleteStep = (state: BookingState) =>
  STEPS[state.mode].find((step) => !stepComplete(state, step)) ?? 'review';

// Lo que depende de cada elección y se pierde cuando cambia.
const fromDoctor = { date: undefined, slot: undefined, timezone: undefined, availableDays: undefined, notice: undefined };
const fromSpecialty = { doctor: undefined, ...fromDoctor };
const fromClinic = { specialty: undefined, ...fromSpecialty };

export function bookingReducer(state: BookingState, event: BookingEvent): BookingState {
  switch (event.type) {
    case 'select':
      if (event.field === 'clinic') return { ...state, ...fromClinic, clinic: event.option };
      if (event.field === 'specialty') {
        // El médico se conserva si atiende la nueva especialidad (p. ej. el que vino del preset).
        const doctor = attends(state.doctor, event.option.id) ? state.doctor : undefined;
        return { ...state, ...fromSpecialty, specialty: event.option, doctor };
      }
      if (event.field === 'doctor') return { ...state, ...fromDoctor, doctor: event.option };
      return { ...state, [event.field]: event.option };
    case 'next': {
      const steps = STEPS[state.mode];
      const index = steps.indexOf(state.step);
      if (!stepComplete(state, state.step) || index === steps.length - 1) return state;
      return { ...state, step: steps[index + 1]! };
    }
    case 'back': {
      // UI-06: volver conserva lo elegido; solo un cambio de elección invalida.
      const steps = STEPS[state.mode];
      const index = steps.indexOf(state.step);
      return index === 0 ? state : { ...state, step: steps[index - 1]! };
    }
    case 'availableDaysLoaded': {
      const loaded = { ...state, timezone: event.timezone, availableDays: event.days };
      // UI-06: sin cupos se ofrece la lista de espera o elegir otro médico.
      if (event.days.length === 0) return { ...loaded, date: undefined, slot: undefined, notice: 'no-slots' };
      if (state.date && event.days.includes(state.date)) return loaded;
      return { ...loaded, date: event.days[0], slot: undefined };
    }
    case 'presetResolved': {
      const resolved: BookingState = {
        ...state,
        preset: undefined,
        // El personal trabaja en su sede: la del preset no aplica.
        clinic: state.mode === 'online' ? event.clinic : undefined,
        specialty: event.specialty,
      };
      // El médico solo se conserva si es de la sede y atiende la especialidad resueltas.
      const doctor = event.doctor;
      const consistent =
        !!doctor &&
        doctor.meta?.clinicId === clinicOf(resolved)?.id &&
        (!resolved.specialty || attends(doctor, resolved.specialty.id));
      if (consistent) resolved.doctor = doctor;
      return { ...resolved, step: firstIncompleteStep(resolved) };
    }
    case 'reset':
      return initialBooking(state.mode, undefined, state.fixedClinic);
    case 'setReason':
      return event.reason.length > MAX_REASON_LENGTH ? state : { ...state, reason: event.reason };
    case 'slotTaken':
      return { ...state, step: 'slot', slot: undefined, notice: 'slot-taken' };
    case 'selectDay':
      return { ...state, date: event.date, slot: undefined };
    case 'selectSlot':
      if (!event.slot.available) return state;
      return { ...state, slot: event.slot, notice: undefined };
    default:
      return state;
  }
}

function summarize(state: BookingState): BookingSummary {
  const clinic = clinicOf(state);
  const entries: Partial<Record<keyof BookingSummary, unknown>> = {
    clinic: clinic?.label ?? state.doctor?.meta?.clinicName,
    specialty: state.specialty?.label,
    doctor: state.doctor?.label,
    patient: state.patient?.label,
    date: state.date,
    startTime: state.slot?.startTime,
    endTime: state.slot?.endTime,
    timezone: state.timezone ?? clinic?.meta?.timezone,
    price: state.specialty?.meta?.price,
    // Sin sede del personal (o sin su moneda) vale la del médico, que es de la misma sede.
    currency: clinic?.meta?.currency ?? state.doctor?.meta?.currency,
  };
  return Object.fromEntries(Object.entries(entries).filter(([, v]) => v !== undefined)) as BookingSummary;
}

export function describeBooking(state: BookingState): BookingView {
  return {
    steps: STEPS[state.mode],
    activeStep: state.step,
    canAdvance: state.step !== 'review' && stepComplete(state, state.step),
    missing: missingFields(state),
    notice: state.notice,
    summary: summarize(state),
  };
}

export function toBookingCommand(state: BookingState): BookingCommand {
  const [missing] = missingFields(state);
  if (missing) throw new Error(`La reserva está incompleta: falta ${missing}`);
  const slot = state.slot!;
  const reason = state.reason.trim();
  const command = {
    scheduleId: slot.scheduleId,
    startTime: slot.startTime,
    endTime: slot.endTime,
    ...(reason && { reason }),
  };
  return state.mode === 'online'
    ? { mode: 'online', ...command }
    : { mode: 'administrative', patientId: state.patient!.id, ...command };
}
