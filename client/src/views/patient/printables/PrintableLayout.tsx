'use client';

import './print.css';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Logo from '@/components/layout/shared/Logo';
import type { Appointment } from '@/views/appointments/types';

interface PrintableLayoutProps {
  title: string;
  /** Línea bajo el título, p. ej. "Cita #501". */
  reference: string;
  appointment?: Appointment;
  /** Acciones extra junto a Imprimir (p. ej. descargar el PDF). */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Documento imprimible con la presentación de la vista previa imprimible de Materio:
 * encabezado con la sede, contenido y acciones a la derecha (ocultas al imprimir).
 */
export function PrintableLayout({ title, reference, appointment, actions, children }: PrintableLayoutProps) {
  return (
    <div className='grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]'>
      <Card className='printable-document'>
        <CardContent className='flex flex-col gap-6 sm:p-12'>
          <header className='flex flex-col sm:flex-row justify-between gap-4 p-6 rounded' style={{ background: 'var(--mui-palette-action-hover)' }}>
            <div className='flex flex-col gap-4'>
              <Logo standalone />
              {appointment?.clinic && (
                <div>
                  <Typography color='text.primary'>{appointment.clinic.name}</Typography>
                  {appointment.clinic.address && <Typography color='text.primary'>{appointment.clinic.address}</Typography>}
                </div>
              )}
            </div>
            <div className='flex flex-col gap-1 sm:text-end'>
              <Typography variant='h5' component='h1'>
                {title}
              </Typography>
              <Typography color='text.primary'>{reference}</Typography>
            </div>
          </header>
          {children}
        </CardContent>
      </Card>
      <Card className='self-start'>
        <CardContent className='flex flex-col gap-3'>
          <Button variant='contained' startIcon={<i className='ri-printer-line' />} onClick={() => window.print()}>
            Imprimir
          </Button>
          {actions}
          <Button component={Link} href='/patient/appointments' variant='outlined' startIcon={<i className='ri-arrow-left-line' />}>
            Volver a Mis citas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** Pares rótulo-valor del documento. */
export function DetailList({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className='grid gap-x-6 gap-y-2 m-0 sm:grid-cols-[auto_1fr]'>
      {items.map(([label, value]) => (
        <div key={label} className='contents'>
          <Typography component='dt' color='text.secondary'>
            {label}
          </Typography>
          <Typography component='dd' color='text.primary' className='m-0 first-letter:uppercase'>
            {value}
          </Typography>
        </div>
      ))}
    </dl>
  );
}

/** Fecha y hora de la cita en la zona de su sede. */
export function appointmentWhen(a: Appointment): string {
  const day = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${a.schedule.scheduleDate.slice(0, 10)}T12:00:00Z`),
  );
  return `${day}, ${a.startTime} (hora de la sede)`;
}

export function PrintableMessage({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className='flex flex-col items-start gap-4'>
        <Typography>{children}</Typography>
        <Button component={Link} href='/patient/appointments' variant='outlined'>
          Volver a Mis citas
        </Button>
      </CardContent>
    </Card>
  );
}
