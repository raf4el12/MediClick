'use client';

import { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import type { AppointmentStatus } from '@/views/appointments/types';
import AgendaCalendar from '@/views/agenda/components/AgendaCalendar';
import AgendaFilters from '@/views/agenda/components/AgendaFilters';
import { specialtyName } from '@/views/agenda/model/specialtyName';
import { ALL_STATUSES } from '@/views/agenda/status';
import type { AgendaAppointment } from '@/views/agenda/types';
import AtencionPanel from '../jornada/components/AtencionPanel';

const SCOPE = {};

/** Agenda del médico con cupos libres y reagendamiento por arrastre (UI-14, variante B). */
export default function DoctorAgendaView() {
  const user = useAppSelector(selectUser);
  const timezone = user?.clinicTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [statuses, setStatuses] = useState<AppointmentStatus[]>(ALL_STATUSES);
  const [showFreeCupos, setShowFreeCupos] = useState(true);
  const [selected, setSelected] = useState<{ appointment: AgendaAppointment; specialty: string } | null>(null);

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1'>
          Mi agenda
        </Typography>
        <Typography color='text.secondary'>Horas en la zona de la sede. Arrastra una cita pendiente o confirmada a un cupo libre para reagendarla.</Typography>
      </div>
      <div className='grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] items-start'>
        <Card>
          <CardContent>
            <AgendaFilters statuses={statuses} onStatusesChange={setStatuses} showFreeCupos={showFreeCupos} onShowFreeCuposChange={setShowFreeCupos} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <AgendaCalendar
              scope={SCOPE}
              statuses={statuses}
              showFreeCupos={showFreeCupos}
              onSelectAppointment={(appointment, agenda) => setSelected({ appointment, specialty: specialtyName(agenda, appointment.specialtyId) })}
            />
          </CardContent>
        </Card>
      </div>
      <Drawer
        anchor='right'
        open={!!selected}
        onClose={() => setSelected(null)}
        slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-label': 'Espacio de atención', className: 'is-[440px] max-is-full p-6' } }}
      >
        {selected && (
          <AtencionPanel
            key={selected.appointment.id}
            appointment={selected.appointment}
            specialtyName={selected.specialty}
            timezone={timezone}
            onClose={() => setSelected(null)}
          />
        )}
      </Drawer>
    </div>
  );
}
