'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import type { SelectChangeEvent } from '@mui/material/Select';
import { DebouncedInput } from '@/components/shared/DebouncedInput';
import type { Specialty } from '@/views/specialties/types';

interface DoctorFiltersProps {
  specialties: Specialty[];
  selectedSpecialty: number | undefined;
  onSpecialtyChange: (specialtyId: number | undefined) => void;
  onSearch: (value: string) => void;
  onAddClick: () => void;
}

export function DoctorFilters({
  specialties,
  selectedSpecialty,
  onSpecialtyChange,
  onSearch,
  onAddClick,
}: DoctorFiltersProps) {
  const handleSpecialtyChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    onSpecialtyChange(value === 'all' ? undefined : Number(value));
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Doctores
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona los doctores del sistema
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<i className="ri-add-line" />}
          onClick={onAddClick}
        >
          Nuevo Doctor
        </Button>
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
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
    </Box>
  );
}
