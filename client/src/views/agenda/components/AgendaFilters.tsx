'use client';

import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import type { AppointmentStatus } from '@/views/appointments/types';
import { ALL_STATUSES, STATUS_META } from '../status';

interface AgendaFiltersProps {
  statuses: AppointmentStatus[];
  onStatusesChange: (statuses: AppointmentStatus[]) => void;
  showFreeCupos: boolean;
  onShowFreeCuposChange: (show: boolean) => void;
}

/** Filtros de la agenda (patrón `SidebarLeft` del calendario de Materio). */
export default function AgendaFilters({ statuses, onStatusesChange, showFreeCupos, onShowFreeCuposChange }: AgendaFiltersProps) {
  const toggle = (status: AppointmentStatus) =>
    onStatusesChange(statuses.includes(status) ? statuses.filter((s) => s !== status) : [...statuses, status]);

  return (
    <div className='flex flex-col gap-4'>
      <FormControlLabel
        control={<Switch checked={showFreeCupos} onChange={(_, checked) => onShowFreeCuposChange(checked)} />}
        label='Mostrar cupos libres'
      />
      <Divider />
      <fieldset className='flex flex-col border-0 m-0 p-0'>
        <Typography component='legend' variant='h6' className='mbe-2'>
          Estados
        </Typography>
        <FormControlLabel
          label='Ver todos'
          control={
            <Checkbox
              checked={statuses.length === ALL_STATUSES.length}
              indeterminate={statuses.length > 0 && statuses.length < ALL_STATUSES.length}
              onChange={(_, checked) => onStatusesChange(checked ? ALL_STATUSES : [])}
            />
          }
        />
        {ALL_STATUSES.map((status) => {
          const { label, color } = STATUS_META[status];
          return (
            <FormControlLabel
              key={status}
              label={
                <span className='flex items-center gap-2'>
                  <span aria-hidden className='inline-block is-2.5 bs-2.5 rounded-full' style={{ backgroundColor: `var(--mui-palette-${color}-main)` }} />
                  {label}
                </span>
              }
              control={<Checkbox checked={statuses.includes(status)} onChange={() => toggle(status)} />}
            />
          );
        })}
      </fieldset>
    </div>
  );
}
