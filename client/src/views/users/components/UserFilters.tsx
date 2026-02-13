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

const ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'RECEPTIONIST', label: 'Recepcionista' },
];

interface UserFiltersProps {
  selectedRole: string | undefined;
  onRoleChange: (role: string | undefined) => void;
  onSearch: (value: string) => void;
  onAddClick: () => void;
}

export function UserFilters({
  selectedRole,
  onRoleChange,
  onSearch,
  onAddClick,
}: UserFiltersProps) {
  const handleRoleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    onRoleChange(value === 'all' ? undefined : value);
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
            Usuarios
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona los usuarios y sus roles en el sistema
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<i className="ri-add-line" />}
          onClick={onAddClick}
        >
          Nuevo Usuario
        </Button>
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
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
    </Box>
  );
}
