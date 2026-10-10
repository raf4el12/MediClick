'use client';

import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { AppointmentStatus } from '@/views/appointments/types';

/** Mismo color que el fondo de la cita en `AppFullCalendar`. */
const STATUSES: { status: AppointmentStatus; label: string; color: string }[] = [
  { status: AppointmentStatus.PENDING, label: 'Pendiente', color: 'warning' },
  { status: AppointmentStatus.CONFIRMED, label: 'Confirmada', color: 'success' },
  { status: AppointmentStatus.IN_PROGRESS, label: 'En curso', color: 'info' },
  { status: AppointmentStatus.COMPLETED, label: 'Completada', color: 'primary' },
  { status: AppointmentStatus.CANCELLED, label: 'Cancelada', color: 'secondary' },
  { status: AppointmentStatus.NO_SHOW, label: 'Inasistencia', color: 'error' },
];

export const ALL_STATUSES = STATUSES.map((s) => s.status);

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
              checked={statuses.length === STATUSES.length}
              indeterminate={statuses.length > 0 && statuses.length < STATUSES.length}
              onChange={(_, checked) => onStatusesChange(checked ? ALL_STATUSES : [])}
            />
          }
        />
        {STATUSES.map(({ status, label, color }) => (
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
        ))}
      </fieldset>
    </div>
  );
}
