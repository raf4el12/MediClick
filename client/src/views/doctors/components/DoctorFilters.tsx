'use client';

import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { Specialty } from '@/views/specialties/types';

interface DoctorFiltersProps {
  specialties: Specialty[];
  selectedSpecialty: number | undefined;
  onSpecialtyChange: (specialtyId: number | undefined) => void;
}

/** Filtros de la lista de médicos (patrón `TableFilters` de Materio). */
export function DoctorFilters({ specialties, selectedSpecialty, onSpecialtyChange }: DoctorFiltersProps) {
  return (
    <div className='grid gap-5 sm:grid-cols-3'>
      <TextField
        select
        fullWidth
        size='small'
        id='medicos-especialidad'
        label='Especialidad'
        value={selectedSpecialty?.toString() ?? 'all'}
        onChange={(e) => onSpecialtyChange(e.target.value === 'all' ? undefined : Number(e.target.value))}
      >
        <MenuItem value='all'>Todas</MenuItem>
        {specialties.map((spec) => (
          <MenuItem key={spec.id} value={spec.id.toString()}>
            {spec.name}
          </MenuItem>
        ))}
      </TextField>
    </div>
  );
}
