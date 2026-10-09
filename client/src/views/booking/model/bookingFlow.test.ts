import { describe, expect, it } from 'vitest';
import { bookingReducer, describeBooking, initialBooking, toBookingCommand } from './bookingFlow';
import type { BookingEvent, BookingOption, BookingState, SlotOption } from './types';

const lima: BookingOption = { id: 1, label: 'Sede Miraflores', meta: { currency: 'PEN', timezone: 'America/Lima' } };
const bogota: BookingOption = { id: 2, label: 'Sede Chapinero', meta: { currency: 'COP', timezone: 'America/Bogota' } };
const cardiologia: BookingOption = { id: 2, label: 'Cardiología', meta: { price: 150 } };
const pediatria: BookingOption = { id: 3, label: 'Pediatría', meta: { price: 120 } };
const ana: BookingOption = { id: 7, label: 'Ana Torres' };
const lucia: BookingOption = { id: 1, label: 'Dra. Lucía Paredes', meta: { clinicId: 1, specialtyIds: [1, 2] } };
const sofia: BookingOption = { id: 5, label: 'Dra. Sofía Méndez', meta: { clinicId: 1, specialtyIds: [1, 2] } };
const cupo0900: SlotOption = {
  scheduleId: 10,
  startTime: '2026-10-12T14:00:00.000Z',
  endTime: '2026-10-12T14:30:00.000Z',
  available: true,
};

const run = (state: BookingState, ...events: BookingEvent[]) => events.reduce(bookingReducer, state);

/** Reserva en línea con sede, especialidad, médico, día y cupo elegidos. */
const withSlot = () =>
  run(
    initialBooking('online'),
    { type: 'select', field: 'clinic', option: lima },
    { type: 'select', field: 'specialty', option: cardiologia },
    { type: 'select', field: 'doctor', option: lucia },
    { type: 'availableDaysLoaded', timezone: 'America/Lima', days: ['2026-10-12', '2026-10-13'] },
    { type: 'selectDay', date: '2026-10-12' },
    { type: 'selectSlot', slot: cupo0900 },
  );

describe('flujo de reserva', () => {
  it('la reserva en línea empieza por la sede', () => {
    const view = describeBooking(initialBooking('online'));

    expect(view.steps).toEqual(['clinic', 'specialty', 'doctor', 'slot', 'review']);
    expect(view.activeStep).toBe('clinic');
  });

  it('la creación administrativa empieza por el paciente y no pide la sede', () => {
    const view = describeBooking(initialBooking('administrative', undefined, lima));

    expect(view.steps).toEqual(['patient', 'specialty', 'doctor', 'slot', 'review']);
    expect(view.activeStep).toBe('patient');
  });

  it('elegir otra sede invalida especialidad, médico, día y cupo', () => {
    const state = run(withSlot(), { type: 'select', field: 'clinic', option: bogota });

    expect(state.clinic).toEqual(bogota);
    expect([state.specialty, state.doctor, state.date, state.slot]).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('elegir otra especialidad invalida médico, día y cupo, pero no el paciente', () => {
    const state = run(
      initialBooking('administrative', undefined, lima),
      { type: 'select', field: 'patient', option: ana },
      { type: 'select', field: 'specialty', option: cardiologia },
      { type: 'select', field: 'doctor', option: lucia },
      { type: 'selectDay', date: '2026-10-12' },
      { type: 'selectSlot', slot: cupo0900 },
      { type: 'select', field: 'specialty', option: pediatria },
    );

    expect(state.patient).toEqual(ana);
    expect([state.doctor, state.date, state.slot]).toEqual([undefined, undefined, undefined]);
  });

  it('elegir otro médico invalida día, cupo y la zona horaria conocida', () => {
    const state = run(withSlot(), { type: 'select', field: 'doctor', option: sofia });

    expect(state.doctor).toEqual(sofia);
    expect([state.date, state.slot, state.timezone]).toEqual([undefined, undefined, undefined]);
  });

  it('elegir otro día invalida el cupo', () => {
    const state = run(withSlot(), { type: 'selectDay', date: '2026-10-13' });

    expect(state.date).toBe('2026-10-13');
    expect(state.slot).toBeUndefined();
  });

  it('un cupo no disponible no se puede elegir', () => {
    const before = run(withSlot(), { type: 'selectDay', date: '2026-10-13' });
    const after = run(before, { type: 'selectSlot', slot: { ...cupo0900, scheduleId: 11, available: false } });

    expect(after).toEqual(before);
  });

  it('elegir no avanza; "siguiente" avanza solo con el paso completo', () => {
    const empty = run(initialBooking('online'), { type: 'next' });
    expect(describeBooking(empty)).toMatchObject({
      activeStep: 'clinic',
      canAdvance: false,
      missing: ['clinic', 'specialty', 'doctor', 'date', 'slot'],
    });

    const chosen = run(empty, { type: 'select', field: 'clinic', option: lima });
    expect(describeBooking(chosen)).toMatchObject({ activeStep: 'clinic', canAdvance: true });

    const advanced = run(chosen, { type: 'next' });
    expect(describeBooking(advanced)).toMatchObject({
      activeStep: 'specialty',
      canAdvance: false,
      missing: ['specialty', 'doctor', 'date', 'slot'],
    });
  });

  it('"atrás" no hace nada en el primer paso y en los demás retrocede conservando lo elegido', () => {
    const first = initialBooking('online');
    expect(run(first, { type: 'back' })).toEqual(first);

    const atSlot = run(withSlot(), { type: 'next' }, { type: 'next' }, { type: 'next' });
    expect(atSlot.step).toBe('slot');

    const back = run(atSlot, { type: 'back' });
    expect(back.step).toBe('doctor');
    expect([back.clinic, back.specialty, back.doctor, back.date, back.slot]).toEqual([lima, cardiologia, lucia, '2026-10-12', cupo0900]);
  });

  it('al cargar los días con cupos fija la zona de la sede y elige el primer día si hace falta', () => {
    const doctorChosen = run(
      initialBooking('online'),
      { type: 'select', field: 'clinic', option: lima },
      { type: 'select', field: 'specialty', option: cardiologia },
      { type: 'select', field: 'doctor', option: lucia },
    );
    const loaded = run(doctorChosen, { type: 'availableDaysLoaded', timezone: 'America/Lima', days: ['2026-10-14', '2026-10-15'] });
    expect([loaded.timezone, loaded.date]).toEqual(['America/Lima', '2026-10-14']);

    const kept = run(withSlot(), { type: 'availableDaysLoaded', timezone: 'America/Lima', days: ['2026-10-12', '2026-10-20'] });
    expect([kept.date, kept.slot]).toEqual(['2026-10-12', cupo0900]);

    const gone = run(withSlot(), { type: 'availableDaysLoaded', timezone: 'America/Lima', days: ['2026-10-20'] });
    expect([gone.date, gone.slot]).toEqual(['2026-10-20', undefined]);
  });

  it('un médico sin días con cupos avisa "no-slots" y elegir otro médico lo limpia', () => {
    const empty = run(withSlot(), { type: 'availableDaysLoaded', timezone: 'America/Lima', days: [] });
    expect([empty.date, empty.slot]).toEqual([undefined, undefined]);
    expect(describeBooking(empty).notice).toBe('no-slots');

    const other = run(empty, { type: 'select', field: 'doctor', option: sofia });
    expect(describeBooking(other).notice).toBeUndefined();
  });

  it('si el cupo ya fue tomado vuelve al paso de cupo con el aviso', () => {
    const atReview = run(withSlot(), { type: 'next' }, { type: 'next' }, { type: 'next' }, { type: 'next' });
    expect(atReview.step).toBe('review');

    const taken = run(atReview, { type: 'slotTaken' });

    expect(taken.slot).toBeUndefined();
    expect(taken.date).toBe('2026-10-12');
    expect(describeBooking(taken)).toMatchObject({ activeStep: 'slot', notice: 'slot-taken' });

    const rechosen = run(taken, { type: 'selectSlot', slot: { ...cupo0900, scheduleId: 12 } });
    expect(describeBooking(rechosen).notice).toBeUndefined();
  });

  it('el motivo admite hasta 500 caracteres y rechaza uno más largo', () => {
    const written = run(initialBooking('online'), { type: 'setReason', reason: 'a'.repeat(500) });
    expect(written.reason).toHaveLength(500);

    const tooLong = run(written, { type: 'setReason', reason: 'b'.repeat(501) });
    expect(tooLong.reason).toBe('a'.repeat(500));
  });

  it('la reserva en línea arma el comando con el cupo y omite el motivo en blanco', () => {
    expect(toBookingCommand(run(withSlot(), { type: 'setReason', reason: '   ' }))).toEqual({
      mode: 'online',
      scheduleId: 10,
      startTime: '2026-10-12T14:00:00.000Z',
      endTime: '2026-10-12T14:30:00.000Z',
    });
    expect(toBookingCommand(run(withSlot(), { type: 'setReason', reason: 'Control anual' }))).toMatchObject({
      reason: 'Control anual',
    });
  });

  it('la creación administrativa incluye al paciente en el comando', () => {
    const state = run(
      initialBooking('administrative', undefined, lima),
      { type: 'select', field: 'patient', option: ana },
      { type: 'select', field: 'specialty', option: cardiologia },
      { type: 'select', field: 'doctor', option: lucia },
      { type: 'selectDay', date: '2026-10-12' },
      { type: 'selectSlot', slot: cupo0900 },
    );

    expect(toBookingCommand(state)).toEqual({
      mode: 'administrative',
      patientId: 7,
      scheduleId: 10,
      startTime: '2026-10-12T14:00:00.000Z',
      endTime: '2026-10-12T14:30:00.000Z',
    });
  });

  it('con datos faltantes el comando falla nombrando el primero que falta', () => {
    const noSlot = run(withSlot(), { type: 'selectDay', date: '2026-10-13' });
    expect(() => toBookingCommand(noSlot)).toThrow(/slot/);

    const noPatient = run(
      initialBooking('administrative', undefined, lima),
      { type: 'select', field: 'specialty', option: cardiologia },
      { type: 'select', field: 'doctor', option: lucia },
      { type: 'selectDay', date: '2026-10-12' },
      { type: 'selectSlot', slot: cupo0900 },
    );
    expect(() => toBookingCommand(noPatient)).toThrow(/patient/);
  });

  it('el resumen toma precio y moneda de las opciones elegidas, sin moneda fija', () => {
    expect(describeBooking(withSlot()).summary).toEqual({
      clinic: 'Sede Miraflores',
      specialty: 'Cardiología',
      doctor: 'Dra. Lucía Paredes',
      date: '2026-10-12',
      startTime: '2026-10-12T14:00:00.000Z',
      endTime: '2026-10-12T14:30:00.000Z',
      timezone: 'America/Lima',
      price: 150,
      currency: 'PEN',
    });

    const inBogota = run(
      initialBooking('administrative', undefined, bogota),
      { type: 'select', field: 'patient', option: ana },
      { type: 'select', field: 'specialty', option: { id: 2, label: 'Cardiología', meta: { price: 180000 } } },
    );
    expect(describeBooking(inBogota).summary).toMatchObject({
      clinic: 'Sede Chapinero',
      patient: 'Ana Torres',
      price: 180000,
      currency: 'COP',
    });
  });

  it('reiniciar vuelve al comienzo sin preset; el personal conserva su sede', () => {
    const online = run(initialBooking('online', { doctorId: 1 }), { type: 'select', field: 'clinic', option: lima }, { type: 'reset' });
    expect(online).toEqual(initialBooking('online'));

    const staff = run(
      initialBooking('administrative', { doctorId: 1 }, lima),
      { type: 'select', field: 'patient', option: ana },
      { type: 'reset' },
    );
    expect(staff).toEqual(initialBooking('administrative', undefined, lima));
  });

  describe('selecciones preestablecidas', () => {
    it('un preset completo y consistente salta a elegir el cupo', () => {
      const pending = initialBooking('online', { clinicId: 1, specialtyId: 2, doctorId: 1 });
      expect(pending.preset).toEqual({ clinicId: 1, specialtyId: 2, doctorId: 1 });

      const state = run(pending, { type: 'presetResolved', clinic: lima, specialty: cardiologia, doctor: lucia });

      expect([state.clinic, state.specialty, state.doctor, state.preset]).toEqual([lima, cardiologia, lucia, undefined]);
      expect(describeBooking(state).activeStep).toBe('slot');
    });
 
    it('un preset con solo el médico fija su sede; si atiende varias especialidades pide la especialidad y conserva al médico', () => {
      // El hook resuelve la sede del médico y, si atiende una sola especialidad, también esa.
      const single = run(initialBooking('online', { doctorId: 4 }), {
        type: 'presetResolved',
        clinic: lima,
        specialty: cardiologia,
        doctor: { id: 4, label: 'Dr. Martín Fernández', meta: { clinicId: 1, specialtyIds: [2] } },
      });
      expect(describeBooking(single).activeStep).toBe('slot');

      const several = run(initialBooking('online', { doctorId: 1 }), { type: 'presetResolved', clinic: lima, doctor: lucia });
      expect(describeBooking(several).activeStep).toBe('specialty');
      expect([several.clinic, several.doctor]).toEqual([lima, lucia]);

      const chosen = run(several, { type: 'select', field: 'specialty', option: cardiologia });
      expect(chosen.doctor).toEqual(lucia);
    });
 
    it('un preset inconsistente descarta al médico y deja activo el primer paso sin resolver', () => {
      const otherClinic = run(initialBooking('online', { clinicId: 2, specialtyId: 2, doctorId: 1 }), {
        type: 'presetResolved',
        clinic: bogota,
        specialty: cardiologia,
        doctor: lucia,
      });
      expect([otherClinic.clinic, otherClinic.specialty, otherClinic.doctor]).toEqual([bogota, cardiologia, undefined]);
      expect(describeBooking(otherClinic).activeStep).toBe('doctor');

      const otherSpecialty = run(initialBooking('online', { clinicId: 1, specialtyId: 3, doctorId: 1 }), {
        type: 'presetResolved',
        clinic: lima,
        specialty: pediatria,
        doctor: lucia,
      });
      expect(otherSpecialty.doctor).toBeUndefined();
      expect(describeBooking(otherSpecialty).activeStep).toBe('doctor');
    });
 
    it('un id del preset que no está en los catálogos se descarta sin error', () => {
      const unknownDoctor = run(initialBooking('online', { doctorId: 999 }), { type: 'presetResolved' });
      expect(describeBooking(unknownDoctor).activeStep).toBe('clinic');
      expect(unknownDoctor.preset).toBeUndefined();

      const unknownSpecialty = run(initialBooking('online', { clinicId: 1, specialtyId: 99 }), { type: 'presetResolved', clinic: lima });
      expect([unknownSpecialty.clinic, unknownSpecialty.specialty]).toEqual([lima, undefined]);
      expect(describeBooking(unknownSpecialty).activeStep).toBe('specialty');
    });
 
    it('el personal ignora la sede del preset y descarta un médico de otra sede', () => {
      const camila: BookingOption = { id: 3, label: 'Dra. Camila Rojas', meta: { clinicId: 2, specialtyIds: [1, 2] } };
      const foreign = run(initialBooking('administrative', { clinicId: 2, doctorId: 3 }, lima), {
        type: 'presetResolved',
        clinic: bogota,
        doctor: camila,
      });
      expect([foreign.clinic, foreign.doctor]).toEqual([undefined, undefined]);
      expect(describeBooking(foreign).summary.clinic).toBe('Sede Miraflores');

      const own = run(initialBooking('administrative', { specialtyId: 2, doctorId: 1 }, lima), {
        type: 'presetResolved',
        specialty: cardiologia,
        doctor: lucia,
      });
      expect(own.doctor).toEqual(lucia);
      expect(describeBooking(own).activeStep).toBe('patient');
    });
 
    it('una elección manual después del preset aplica la invalidación en cascada', () => {
      const resolved = run(initialBooking('online', { clinicId: 1, specialtyId: 2, doctorId: 1 }), {
        type: 'presetResolved',
        clinic: lima,
        specialty: cardiologia,
        doctor: lucia,
      });

      const moved = run(resolved, { type: 'select', field: 'clinic', option: bogota });

      expect([moved.specialty, moved.doctor]).toEqual([undefined, undefined]);
      expect(describeBooking(moved).missing).toEqual(['specialty', 'doctor', 'date', 'slot']);
    });
  });
});
