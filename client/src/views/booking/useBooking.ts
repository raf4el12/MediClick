'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsService } from '@/services/appointments.service';
import { clinicsService } from '@/services/clinics.service';
import { doctorsService } from '@/services/doctors.service';
import { patientsService } from '@/services/patients.service';
import { paymentsService } from '@/services/payments.service';
import { schedulesService } from '@/services/schedules.service';
import { specialtiesService } from '@/services/specialties.service';
import { extractApiError } from '@/utils/extractApiError';
import { getTodayInTimezone } from '@/utils/timezone';
import type { Clinic } from '@/views/clinics/types';
import type { Doctor } from '@/views/doctors/types';
import type { Patient } from '@/views/patients/types';
import type { Specialty } from '@/views/specialties/types';
import { bookingReducer, describeBooking, initialBooking, toBookingCommand } from './model/bookingFlow';
import type { BookingMode, BookingOption, BookingPreset, SlotOption } from './model/types';

/** `available-days` acepta hasta 62 días: el calendario ofrece ese tramo desde hoy. */
export const BOOKING_WINDOW_DAYS = 62;

export type BookingSubmitResult = { kind: 'redirect'; url: string } | { kind: 'created'; appointmentId: number };

const clinicOption = (c: Clinic): BookingOption => ({
  id: c.id,
  label: c.name,
  meta: { currency: c.currency, timezone: c.timezone },
});

const specialtyOption = (s: Specialty): BookingOption => ({
  id: s.id,
  label: s.name,
  meta: { price: s.price ?? undefined, duration: s.duration, icon: s.icon },
});

const doctorOption = (d: Doctor): BookingOption => ({
  id: d.id,
  label: `${d.profile.name} ${d.profile.lastName}`,
  meta: {
    clinicId: d.clinicId,
    specialtyIds: d.specialties.map((s) => s.id),
    currency: d.clinic?.currency,
    timezone: d.clinic?.timezone,
    clinicName: d.clinic?.name,
    ratingAvg: d.ratingAvg,
    ratingCount: d.ratingCount,
  },
});

const patientOption = (p: Patient): BookingOption => ({
  id: p.id,
  label: `${p.profile.name} ${p.profile.lastName}`,
  meta: {
    document: p.profile.numberDocument ? `${p.profile.typeDocument ?? ''} ${p.profile.numberDocument}`.trim() : null,
    email: p.profile.email,
  },
});

function addDays(isoDay: string, days: number): string {
  const date = new Date(`${isoDay}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Única interfaz de las pantallas de reserva: conecta el núcleo (`model/`) con
 * los catálogos, los cupos y la creación de la cita.
 */
export function useBooking(mode: BookingMode, { preset, fixedClinic }: { preset?: BookingPreset; fixedClinic?: BookingOption } = {}) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(bookingReducer, undefined, () => initialBooking(mode, preset, fixedClinic));
  const view = describeBooking(state);
  const [patientSearch, setPatientSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clinicId = (mode === 'online' ? state.clinic : state.fixedClinic)?.id;
  const specialtyId = state.specialty?.id;
  const doctorId = state.doctor?.id;

  const clinicsQuery = useQuery({
    queryKey: ['booking', 'clinics'],
    queryFn: () => clinicsService.findAll(),
    enabled: mode === 'online',
    staleTime: 10 * 60 * 1000,
  });

  const specialtiesQuery = useQuery({
    queryKey: ['booking', 'specialties'],
    queryFn: () => specialtiesService.findAllPaginated({ pageSize: 100 }).then((r) => r.rows),
    staleTime: 5 * 60 * 1000,
  });

  const doctorsQuery = useQuery({
    queryKey: ['booking', 'doctors', specialtyId, mode === 'online' ? clinicId : null],
    queryFn: () =>
      doctorsService
        .findAllPaginated({ pageSize: 100 }, specialtyId, mode === 'online' ? clinicId : undefined)
        .then((r) => r.rows),
    enabled: !!specialtyId && (mode === 'administrative' || !!clinicId),
    staleTime: 5 * 60 * 1000,
  });

  const presetDoctorQuery = useQuery({
    queryKey: ['booking', 'doctor', preset?.doctorId],
    queryFn: () => doctorsService.findById(preset!.doctorId!),
    enabled: !!state.preset?.doctorId,
    retry: false,
  });

  // "Hoy" es el de la sede: la zona que devuelve el backend o, antes, la de la sede elegida.
  const clinicTimezone = ((mode === 'online' ? state.clinic : state.fixedClinic)?.meta?.timezone ??
    state.doctor?.meta?.timezone) as string | undefined;
  const today = getTodayInTimezone(state.timezone ?? clinicTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const windowEnd = addDays(today, BOOKING_WINDOW_DAYS - 1);

  const availableDaysQuery = useQuery({
    queryKey: ['available-days', doctorId, specialtyId, today, windowEnd],
    queryFn: () =>
      schedulesService.getAvailableDays({ doctorId: doctorId!, specialtyId: specialtyId!, dateFrom: today, dateTo: windowEnd }),
    enabled: !!doctorId && !!specialtyId,
    staleTime: 60 * 1000,
  });

  const timeSlotsQuery = useQuery({
    queryKey: ['time-slots', doctorId, specialtyId, state.date],
    queryFn: () => schedulesService.getTimeSlots({ doctorId: doctorId!, specialtyId: specialtyId!, date: state.date! }),
    enabled: !!doctorId && !!specialtyId && !!state.date,
    staleTime: 30 * 1000,
  });

  const searchText = patientSearch.trim();
  const patientsQuery = useQuery({
    queryKey: ['booking', 'patients', searchText],
    queryFn: () => patientsService.findAllPaginated({ searchValue: searchText, pageSize: 10 }).then((r) => r.rows),
    enabled: mode === 'administrative' && searchText.length >= 2,
    staleTime: 30 * 1000,
  });

  // Los días con cupos fijan la zona de la sede y el día inicial (o el aviso "sin cupos").
  const daysData = availableDaysQuery.data;
  useEffect(() => {
    if (daysData && daysData.doctorId === doctorId && daysData.specialtyId === specialtyId) {
      dispatch({ type: 'availableDaysLoaded', timezone: daysData.timezone, days: daysData.days.map((d) => d.date) });
    }
  }, [daysData, doctorId, specialtyId]);

  // El preset se resuelve contra los catálogos una sola vez.
  const pendingPreset = state.preset;
  const presetDoctor = presetDoctorQuery.data;
  const presetDoctorSettled = !pendingPreset?.doctorId || presetDoctorQuery.isSuccess || presetDoctorQuery.isError;
  const catalogsReady = specialtiesQuery.isSuccess && (mode === 'administrative' || clinicsQuery.isSuccess);
  useEffect(() => {
    if (!pendingPreset || !catalogsReady || !presetDoctorSettled) return;
    const specialties = specialtiesQuery.data ?? [];
    const doctor = pendingPreset.doctorId && presetDoctor?.id === pendingPreset.doctorId ? presetDoctor : undefined;
    const clinic = clinicsQuery.data?.find((c) => c.id === (pendingPreset.clinicId ?? doctor?.clinicId));
    const specialtyId =
      pendingPreset.specialtyId ?? (doctor && doctor.specialties.length === 1 ? doctor.specialties[0]!.id : undefined);
    const specialty = specialties.find((s) => s.id === specialtyId && s.isActive);
    dispatch({
      type: 'presetResolved',
      clinic: clinic && clinicOption(clinic),
      specialty: specialty && specialtyOption(specialty),
      doctor: doctor && doctorOption(doctor),
    });
  }, [pendingPreset, catalogsReady, presetDoctorSettled, presetDoctor, specialtiesQuery.data, clinicsQuery.data]);

  const options = useMemo(() => {
    const specialties = (specialtiesQuery.data ?? []).filter(
      (s) => s.isActive && (mode === 'administrative' || s.clinicId === null || s.clinicId === clinicId),
    );
    return {
      clinics: (clinicsQuery.data ?? []).filter((c) => c.isActive).map(clinicOption),
      specialties: specialties.map(specialtyOption),
      doctors: (doctorsQuery.data ?? []).map(doctorOption),
      patients: (patientsQuery.data ?? []).map(patientOption),
      availableDays: daysData && daysData.doctorId === doctorId ? daysData.days.map((d) => d.date) : [],
      slots: (timeSlotsQuery.data ?? []) as SlotOption[],
    };
  }, [specialtiesQuery.data, clinicsQuery.data, doctorsQuery.data, patientsQuery.data, daysData, doctorId, timeSlotsQuery.data, mode, clinicId]);

  const loading = {
    clinics: clinicsQuery.isLoading,
    specialties: specialtiesQuery.isLoading,
    doctors: doctorsQuery.isLoading,
    days: availableDaysQuery.isLoading,
    slots: timeSlotsQuery.isLoading,
    patients: patientsQuery.isFetching,
    preset: !!pendingPreset,
  };

  async function submit(): Promise<BookingSubmitResult | null> {
    const command = toBookingCommand(state);
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        scheduleId: command.scheduleId,
        startTime: command.startTime,
        endTime: command.endTime,
        reason: command.reason,
      };
      if (command.mode === 'online') {
        const appointment = await appointmentsService.createAsPatient(payload);
        const preference = await paymentsService.createPreference(appointment.id);
        return { kind: 'redirect', url: preference.initPoint };
      }
      const appointment = await appointmentsService.create({ ...payload, patientId: command.patientId });
      return { kind: 'created', appointmentId: appointment.id };
    } catch (err) {
      const { message, status } = extractApiError(err, 'No pudimos crear la cita');
      if (status === 409) {
        dispatch({ type: 'slotTaken' });
        await queryClient.invalidateQueries({ queryKey: ['time-slots', doctorId, specialtyId, state.date] });
      } else {
        setError(message);
      }
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  return { state, view, dispatch, options, loading, today, windowEnd, patientSearch, setPatientSearch, submit, submitting, error };
}

export type Booking = ReturnType<typeof useBooking>;
