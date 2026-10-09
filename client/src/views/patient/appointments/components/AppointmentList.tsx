'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import type { Appointment } from '@/views/appointments/types';
import { doctorName, priceLabel, shortDay, whenLabel } from '../format';
import type { AppointmentAction } from '../functions/appointmentActions';
import { ACTION_ICON, ACTION_LABEL, actionHref } from './AppointmentActionButtons';
import { AppointmentStatusChips } from './AppointmentStatusChips';

interface AppointmentListProps {
  rows: Appointment[];
  actionsFor: (a: Appointment) => AppointmentAction[];
  onOpen: (a: Appointment) => void;
  onRun: (action: AppointmentAction, a: Appointment) => void;
}

/** Tabla al estilo de las listas de Materio; en celular, filas compactas (decisión 4 de UI-10). */
export function AppointmentList({ rows, actionsFor, onOpen, onRun }: AppointmentListProps) {
  const [menu, setMenu] = useState<{ anchor: HTMLElement; appointment: Appointment } | null>(null);

  return (
    <>
      <div className='overflow-x-auto max-md:hidden'>
        <table className='is-full' style={{ borderCollapse: 'collapse' }}>
          <caption className='sr-only'>Tus citas</caption>
          <thead>
            <tr>
              {['Fecha y hora', 'Especialidad y médico', 'Sede', 'Estado', 'Total'].map((h) => (
                <th key={h} scope='col' className='p-4 text-start text-sm font-medium' style={{ color: 'var(--mui-palette-text-secondary)' }}>
                  {h}
                </th>
              ))}
              <th scope='col' className='p-4'>
                <span className='sr-only'>Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const actions = actionsFor(a);
              return (
                <tr key={a.id} style={{ borderTop: '1px solid var(--mui-palette-divider)' }}>
                  <td className='p-4'>
                    <Typography color='text.primary'>{shortDay(a)}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {a.startTime} (hora de la sede)
                    </Typography>
                  </td>
                  <td className='p-4'>
                    <Button variant='text' className='p-0 min-is-0 justify-start' onClick={() => onOpen(a)}>
                      {a.schedule.specialty.name}
                    </Button>
                    <Typography variant='body2' color='text.secondary'>
                      {doctorName(a)}
                    </Typography>
                  </td>
                  <td className='p-4'>
                    <Typography>{a.clinic?.name ?? '—'}</Typography>
                  </td>
                  <td className='p-4'>
                    <AppointmentStatusChips appointment={a} />
                  </td>
                  <td className='p-4'>
                    <Typography>{priceLabel(a)}</Typography>
                  </td>
                  <td className='p-4 text-end'>
                    {actions.length > 0 && (
                      <IconButton aria-label={`Acciones de la cita del ${shortDay(a)}`} onClick={(e) => setMenu({ anchor: e.currentTarget, appointment: a })}>
                        <i className='ri-more-2-line' />
                      </IconButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className='md:hidden flex flex-col m-0 p-0 list-none'>
        {rows.map((a) => (
          <li key={a.id} style={{ borderTop: '1px solid var(--mui-palette-divider)' }}>
            <button
              type='button'
              onClick={() => onOpen(a)}
              className='flex flex-col gap-1 is-full p-4 text-start bg-transparent border-0 cursor-pointer'
              style={{ font: 'inherit', color: 'inherit' }}
            >
              <Typography className='font-medium' component='span'>
                {a.schedule.specialty.name}
              </Typography>
              <Typography variant='body2' color='text.secondary' component='span'>
                {whenLabel(a)}
              </Typography>
              <AppointmentStatusChips appointment={a} />
            </button>
          </li>
        ))}
      </ul>

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        {menu &&
          actionsFor(menu.appointment).map((action) => {
            const href = actionHref(action, menu.appointment);
            const content = (
              <>
                <i className={ACTION_ICON[action]} aria-hidden='true' />
                {ACTION_LABEL[action]}
              </>
            );
            return href ? (
              <MenuItem key={action} component={Link} href={href} className='gap-2'>
                {content}
              </MenuItem>
            ) : (
              <MenuItem
                key={action}
                className='gap-2'
                onClick={() => {
                  onRun(action, menu.appointment);
                  setMenu(null);
                }}
              >
                {content}
              </MenuItem>
            );
          })}
      </Menu>
    </>
  );
}
