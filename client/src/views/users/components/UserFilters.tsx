'use client';

import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

export const ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'DOCTOR', label: 'Médico' },
  { value: 'RECEPTIONIST', label: 'Recepcionista' },
];

interface UserFiltersProps {
  selectedRole: string | undefined;
  onRoleChange: (role: string | undefined) => void;
}

/** Filtros de la lista de usuarios (patrón `TableFilters` de Materio). */
export function UserFilters({ selectedRole, onRoleChange }: UserFiltersProps) {
  return (
    <div className='grid gap-5 sm:grid-cols-3'>
      <TextField
        select
        fullWidth
        size='small'
        id='usuarios-rol'
        label='Rol'
        value={selectedRole ?? 'all'}
        onChange={(e) => onRoleChange(e.target.value === 'all' ? undefined : e.target.value)}
      >
        <MenuItem value='all'>Todos</MenuItem>
        {ROLES.map((r) => (
          <MenuItem key={r.value} value={r.value}>
            {r.label}
          </MenuItem>
        ))}
      </TextField>
    </div>
  );
}
