'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import AgendaStatusChips from '@/views/agenda/components/AgendaStatusChips';
import type { AgendaAppointment } from '@/views/agenda/types';
import { useAtencion } from '../hooks/useAtencion';
import { useSedeNow } from '../hooks/useSedeNow';
import { attentionActions } from '../model/attentionActions';
import ClinicalNotesTab from './ClinicalNotesTab';
import PrescriptionTab from './PrescriptionTab';

interface AtencionPanelProps {
  appointment: AgendaAppointment;
  specialtyName: string;
  timezone: string;
  onClose?: () => void;
}

/** Espacio de atención: datos de la cita, llegada, inasistencia o cierre, notas clínicas y receta. */
export default function AtencionPanel({ appointment, specialtyName, timezone, onClose }: AtencionPanelProps) {
  const [tab, setTab] = useState<'notes' | 'prescription'>('notes');
  const atencion = useAtencion(appointment.id, appointment.status);
  const now = useSedeNow(timezone);
  const actions = attentionActions({ ...appointment, status: atencion.status }, now);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-start justify-between gap-2'>
        <div className='flex items-center gap-3 min-is-0'>
          <CustomAvatar skin='light' color='primary' size={44}>
            {appointment.patient.fullName.charAt(0)}
          </CustomAvatar>
          <div className='min-is-0'>
            <Typography variant='h5' component='h2'>
              {appointment.patient.fullName}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {appointment.startTime}–{appointment.endTime} · {specialtyName}
            </Typography>
          </div>
        </div>
        {onClose && <Button onClick={onClose}>Cerrar</Button>}
      </div>
      <AgendaStatusChips appointment={appointment} status={atencion.status} />
      {atencion.reason && <Typography variant='body2'>Motivo: {atencion.reason}</Typography>}
      {atencion.error && <Alert severity='error'>{atencion.error}</Alert>}
      {(actions.checkIn || actions.noShow || actions.complete) && (
        <div className='flex flex-wrap gap-2'>
          {actions.checkIn && (
            <Button variant='contained' disabled={atencion.busy} onClick={() => atencion.run('checkIn')}>
              Marcar llegada
            </Button>
          )}
          {actions.noShow && (
            <Button variant='outlined' disabled={atencion.busy} onClick={() => atencion.run('noShow')}>
              Inasistencia
            </Button>
          )}
          {actions.complete && (
            <Button variant='contained' disabled={atencion.busy} onClick={() => atencion.run('complete')}>
              Completar atención
            </Button>
          )}
        </div>
      )}
      <Tabs value={tab} onChange={(_, value) => setTab(value)} aria-label='Registro de la atención'>
        <Tab value='notes' label='Notas clínicas' id='atencion-tab-notes' aria-controls='atencion-panel-notes' />
        <Tab value='prescription' label='Receta' id='atencion-tab-prescription' aria-controls='atencion-panel-prescription' />
      </Tabs>
      <div role='tabpanel' id={`atencion-panel-${tab}`} aria-labelledby={`atencion-tab-${tab}`}>
        {tab === 'notes' ? (
          <ClinicalNotesTab
            key={appointment.id}
            appointmentId={appointment.id}
            notes={atencion.notes}
            loading={atencion.loadingNotes}
            busy={atencion.busy}
            canWrite={actions.write}
            onCreate={atencion.createNote}
          />
        ) : (
          <PrescriptionTab
            key={appointment.id}
            appointmentId={appointment.id}
            prescription={atencion.prescription}
            loading={atencion.loadingPrescription}
            busy={atencion.busy}
            canWrite={actions.write}
            onCreate={atencion.createPrescription}
          />
        )}
      </div>
    </div>
  );
}
