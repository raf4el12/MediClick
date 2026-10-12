'use client';

import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { DebouncedInput } from '@/components/shared/DebouncedInput';

type Status = 'all' | 'active' | 'inactive';

interface PatientFiltersProps {
  searchValue: string;
  onSearch: (value: string) => void;
  status: Status;
  onStatusChange: (status: Status) => void;
  onCreate: () => void;
}

/** Búsqueda, estado y alta (patrón `TableFilters` de la lista de usuarios de Materio). */
export function PatientFilters({ searchValue, onSearch, status, onStatusChange, onCreate }: PatientFiltersProps) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-4 p-5'>
      <div className='flex flex-wrap items-center gap-4'>
        <DebouncedInput
          value={searchValue}
          onChange={onSearch}
          placeholder='Nombre, email o documento'
          slotProps={{ htmlInput: { 'aria-label': 'Buscar paciente' } }}
          className='is-full sm:is-72'
        />
        <TextField select size='small' id='pacientes-estado' label='Estado' value={status} onChange={(e) => onStatusChange(e.target.value as Status)} className='is-40'>
          <MenuItem value='all'>Todos</MenuItem>
          <MenuItem value='active'>Activos</MenuItem>
          <MenuItem value='inactive'>Inactivos</MenuItem>
        </TextField>
      </div>
      <Button variant='contained' startIcon={<i className='ri-add-line' aria-hidden />} onClick={onCreate}>
        Registrar paciente
      </Button>
    </div>
  );
}
