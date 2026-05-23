'use client';

import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import type { SelectChangeEvent } from '@mui/material/Select';
import { DebouncedInput } from '@/components/shared/DebouncedInput';

const ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'RECEPTIONIST', label: 'Recepcionista' },
];

interface UserFiltersProps {
  selectedRole: string | undefined;
  onRoleChange: (role: string | undefined) => void;
  onSearch: (value: string) => void;
}

export function UserFilters({
  selectedRole,
  onRoleChange,
  onSearch,
}: UserFiltersProps) {
  const handleRoleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    onRoleChange(value === 'all' ? undefined : value);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="role-filter-label">Filtrar por Rol</InputLabel>
        <Select
          labelId="role-filter-label"
          value={selectedRole ?? 'all'}
          onChange={handleRoleChange}
          label="Filtrar por Rol"
        >
          <MenuItem value="all">Todos</MenuItem>
          {ROLES.map((r) => (
            <MenuItem key={r.value} value={r.value}>
              {r.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <DebouncedInput
        placeholder="Buscar usuarios..."
        onChange={onSearch}
        sx={{ minWidth: 250 }}
      />
    </Box>
  );
}
