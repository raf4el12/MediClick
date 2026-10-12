'use client';

import { useCallback } from 'react';
import Button from '@mui/material/Button';
import { DebouncedInput } from '@/components/shared/DebouncedInput';

interface CategoryFiltersProps {
  searchValue: string;
  onSearch: (value: string) => void;
  onAddClick: () => void;
}

/** Búsqueda y alta de categorías (barra de la lista de usuarios de Materio). */
export function CategoryFilters({ searchValue, onSearch, onAddClick }: CategoryFiltersProps) {
  // DebouncedInput avisa también al montar: solo se busca si el texto cambió.
  const handleSearch = useCallback((value: string) => {
    if (value !== searchValue) onSearch(value);
  }, [searchValue, onSearch]);

  return (
    <div className='flex flex-wrap items-center justify-between gap-4 p-5'>
      <DebouncedInput
        value={searchValue}
        onChange={handleSearch}
        placeholder='Buscar categorías'
        className='max-sm:is-full sm:is-72'
        slotProps={{ htmlInput: { 'aria-label': 'Buscar categorías' } }}
      />
      <Button variant='contained' startIcon={<i className='ri-add-line' aria-hidden />} onClick={onAddClick} className='max-sm:is-full'>
        Nueva categoría
      </Button>
    </div>
  );
}
