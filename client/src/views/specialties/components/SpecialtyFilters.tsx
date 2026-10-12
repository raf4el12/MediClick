'use client';

import { useCallback } from 'react';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { DebouncedInput } from '@/components/shared/DebouncedInput';
import type { Category } from '../types';

interface SpecialtyFiltersProps {
  categories: Category[];
  selectedCategory: number | undefined;
  onCategoryChange: (categoryId: number | undefined) => void;
  searchValue: string;
  onSearch: (value: string) => void;
  onAddClick: () => void;
}

/** Filtro por categoría, búsqueda y alta (barra de la lista de usuarios de Materio). */
export function SpecialtyFilters({ categories, selectedCategory, onCategoryChange, searchValue, onSearch, onAddClick }: SpecialtyFiltersProps) {
  // DebouncedInput avisa también al montar: solo se busca si el texto cambió.
  const handleSearch = useCallback((value: string) => {
    if (value !== searchValue) onSearch(value);
  }, [searchValue, onSearch]);

  return (
    <div className='flex flex-wrap items-center justify-between gap-4 p-5'>
      <div className='flex flex-wrap items-center gap-4 max-sm:is-full'>
        <TextField
          select
          id='especialidades-categoria'
          size='small'
          label='Categoría'
          value={selectedCategory?.toString() ?? 'all'}
          onChange={(e) => onCategoryChange(e.target.value === 'all' ? undefined : Number(e.target.value))}
          className='max-sm:is-full sm:is-56'
        >
          <MenuItem value='all'>Todas</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id.toString()}>
              {cat.name}
            </MenuItem>
          ))}
        </TextField>
        <DebouncedInput
          value={searchValue}
          onChange={handleSearch}
          placeholder='Buscar especialidades'
          className='max-sm:is-full sm:is-72'
          slotProps={{ htmlInput: { 'aria-label': 'Buscar especialidades' } }}
        />
      </div>
      <Button variant='contained' startIcon={<i className='ri-add-line' aria-hidden />} onClick={onAddClick} className='max-sm:is-full'>
        Nueva especialidad
      </Button>
    </div>
  );
}
