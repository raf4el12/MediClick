'use client';

import Link from 'next/link';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import type { Appointment } from '@/views/appointments/types';
import { AppointmentStatusChips } from '@/views/patient/appointments/components/AppointmentStatusChips';
import { shortDay } from '@/views/patient/appointments/format';

export function RecentAppointments({ appointments }: { appointments: Appointment[] }) {
  return (
    <Card component='section' aria-labelledby='recent-appointments-title'>
      <CardHeader title='Citas recientes' slotProps={{ title: { id: 'recent-appointments-title', component: 'h2', variant: 'h5' } }} />
      <CardContent className='flex flex-col gap-4'>
        {appointments.length === 0 && <Typography color='text.secondary'>Todavía no tienes citas.</Typography>}
        {appointments.map((a) => (
          <div key={a.id} className='flex items-center justify-between gap-3'>
            <div>
              <Typography color='text.primary'>{a.schedule.specialty.name}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {shortDay(a)} · {a.clinic?.name ?? '—'}
              </Typography>
            </div>
            <AppointmentStatusChips appointment={a} />
          </div>
        ))}
        <Button component={Link} href='/patient/appointments' variant='text' className='self-start'>
          Ver todas mis citas
        </Button>
      </CardContent>
    </Card>
  );
}
