'use client';

import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import type { SelectChangeEvent } from '@mui/material/Select';
import { DebouncedInput } from '@/components/shared/DebouncedInput';
import type { Specialty } from '@/views/specialties/types';

interface DoctorFiltersProps {
  specialties: Specialty[];
  selectedSpecialty: number | undefined;
  onSpecialtyChange: (specialtyId: number | undefined) => void;
  onSearch: (value: string) => void;
}

export function DoctorFilters({
  specialties,
  selectedSpecialty,
  onSpecialtyChange,
  onSearch,
}: DoctorFiltersProps) {
  const handleSpecialtyChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    onSpecialtyChange(value === 'all' ? undefined : Number(value));
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
      <FormControl size="small" sx={{ minWidth: 220 }}>
        <InputLabel id="specialty-filter-label">
          Filtrar por Especialidad
        </InputLabel>
        <Select
          labelId="specialty-filter-label"
          value={selectedSpecialty?.toString() ?? 'all'}
          onChange={handleSpecialtyChange}
          label="Filtrar por Especialidad"
        >
          <MenuItem value="all">Todas</MenuItem>
          {specialties.map((spec) => (
            <MenuItem key={spec.id} value={spec.id.toString()}>
              {spec.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <DebouncedInput
        placeholder="Buscar doctores..."
        onChange={onSearch}
        sx={{ minWidth: 250 }}
      />
    </Box>
  );
}
