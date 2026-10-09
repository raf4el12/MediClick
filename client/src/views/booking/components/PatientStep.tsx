'use client';

import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import type { BookingOption } from '../model/types';
import type { Booking } from '../useBooking';

export function PatientStep({ booking, autoFocus }: { booking: Booking; autoFocus?: boolean }) {
  const { state, options, loading, patientSearch, setPatientSearch, dispatch } = booking;
  const text = patientSearch.trim();
  // Conserva al paciente elegido entre las opciones aunque la búsqueda cambie.
  const choices = state.patient && !options.patients.some((p) => p.id === state.patient!.id) ? [state.patient, ...options.patients] : options.patients;

  return (
    <Autocomplete<BookingOption>
      options={choices}
      value={state.patient ?? null}
      onChange={(_, option) => option && dispatch({ type: 'select', field: 'patient', option })}
      inputValue={patientSearch}
      onInputChange={(_, value) => setPatientSearch(value)}
      filterOptions={(x) => x}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionLabel={(p) => (p.meta?.document ? `${p.label} · ${p.meta.document as string}` : p.label)}
      loading={loading.patients}
      loadingText='Buscando…'
      noOptionsText={text.length < 2 ? 'Escribe al menos 2 letras del nombre o documento' : `No encontramos pacientes con «${text}»`}
      renderInput={(params) => <TextField {...params} label='Paciente' placeholder='Nombre o documento' autoFocus={autoFocus} />}
    />
  );
}
