'use client';

import Link from 'next/link';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import type { Appointment } from '@/views/appointments/types';
import { AppointmentActionButtons } from '@/views/patient/appointments/components/AppointmentActionButtons';
import { AppointmentStatusChips } from '@/views/patient/appointments/components/AppointmentStatusChips';
import { doctorName, whenLabel } from '@/views/patient/appointments/format';
import { appointmentActions, type AppointmentAction } from '@/views/patient/appointments/functions/appointmentActions';

interface NextAppointmentCardProps {
  appointment: Appointment | null;
  onRun: (action: AppointmentAction, appointment: Appointment) => void;
  paying: boolean;
}

/** Próxima cita destacada con las acciones de la matriz (decisión 2 de UI-10). */
export function NextAppointmentCard({ appointment, onRun, paying }: NextAppointmentCardProps) {
  return (
    <Card component='section' aria-labelledby='next-appointment-title'>
      <CardHeader
        title='Tu próxima cita'
        slotProps={{ title: { id: 'next-appointment-title', component: 'h2', variant: 'h5' } }}
        subheader={appointment ? whenLabel(appointment) : undefined}
        action={appointment ? <AppointmentStatusChips appointment={appointment} /> : undefined}
      />
      <CardContent className='flex flex-col gap-4'>
        {appointment ? (
          <>
            <div className='flex items-center gap-3'>
              <Avatar aria-hidden='true'>{appointment.schedule.doctor.name.charAt(0)}</Avatar>
              <div>
                <Typography className='font-medium' color='text.primary'>
                  {appointment.schedule.specialty.name} con {doctorName(appointment)}
                </Typography>
                {appointment.clinic && (
                  <Typography variant='body2' color='text.secondary'>
                    {appointment.clinic.name}
                    {appointment.clinic.address ? ` · ${appointment.clinic.address}` : ''}
                  </Typography>
                )}
              </div>
            </div>
            <AppointmentActionButtons
              appointment={appointment}
              actions={appointmentActions(appointment, { now: new Date(), reviewed: false })}
              onRun={onRun}
              paying={paying}
            />
          </>
        ) : (
          <div className='flex flex-col items-start gap-3'>
            <Typography color='text.secondary'>No tienes citas próximas.</Typography>
            <Button component={Link} href='/patient/book' variant='outlined'>
              Reservar una cita
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
