'use client';

import { useCallback } from 'react';
import Button from '@mui/material/Button';
import { DebouncedInput } from '@/components/shared/DebouncedInput';

interface ClinicFiltersProps {
  searchValue: string;
  onSearch: (value: string) => void;
  onAddClick: () => void;
}

/** Búsqueda y alta de sedes (barra de la lista de usuarios de Materio). */
export function ClinicFilters({ searchValue, onSearch, onAddClick }: ClinicFiltersProps) {
  // DebouncedInput avisa también al montar: solo se busca si el texto cambió.
  const handleSearch = useCallback((value: string) => {
    if (value !== searchValue) onSearch(value);
  }, [searchValue, onSearch]);

  return (
    <div className='flex flex-wrap items-center justify-between gap-4 p-5'>
      <DebouncedInput
        value={searchValue}
        onChange={handleSearch}
        placeholder='Buscar sedes'
        className='max-sm:is-full sm:is-72'
        slotProps={{ htmlInput: { 'aria-label': 'Buscar sedes' } }}
      />
      <Button variant='contained' startIcon={<i className='ri-add-line' aria-hidden />} onClick={onAddClick} className='max-sm:is-full'>
        Nueva sede
      </Button>
    </div>
  );
}
