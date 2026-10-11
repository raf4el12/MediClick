'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import MuiTimeline from '@mui/lab/Timeline';
import type { TimelineProps } from '@mui/lab/Timeline';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { toRecordTimeline } from '../functions/recordTimeline';
import type { PatientRecordAppointment } from '../types';

// Timeline de Materio (`UserActivityTimeline`): sin la columna opuesta.
const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  margin: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    '&:before': { display: 'none' },
  },
});

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const dayLabel = (date: string) => {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** Pestaña "Citas": línea de tiempo de la más reciente a la más antigua, con sus notas clínicas. */
export default function RecordAppointments({ appointments }: { appointments: PatientRecordAppointment[] }) {
  const timeline = toRecordTimeline(appointments);

  return (
    <Card>
      <CardHeader title='Citas' subheader='De la más reciente a la más antigua' />
      <CardContent>
        {timeline.length === 0 ? (
          <Typography color='text.secondary'>No hay citas registradas.</Typography>
        ) : (
          <Timeline aria-label='Citas del paciente'>
            {timeline.map((item, i) => (
              <TimelineItem key={item.id}>
                <TimelineSeparator>
                  <TimelineDot color={item.statusColor} />
                  {i < timeline.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent className='flex flex-col gap-2 pbe-6'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <Typography className='font-medium tabular-nums' color='text.primary'>
                      {dayLabel(item.date)} · {item.time}
                    </Typography>
                    <Chip size='small' variant='tonal' color={item.statusColor} label={item.statusLabel} />
                  </div>
                  <Typography>
                    {item.doctorName ?? 'Médico sin asignar'}
                    {item.reason ? ` · ${item.reason}` : ''}
                  </Typography>
                  {item.notes.map((note, j) => (
                    <div key={j} className='flex flex-col gap-1 p-3 rounded' style={{ backgroundColor: 'var(--mui-palette-action-hover)' }}>
                      {note.diagnosis && (
                        <Typography variant='body2'>
                          <strong>Diagnóstico:</strong> {note.diagnosis}
                        </Typography>
                      )}
                      {note.plan && (
                        <Typography variant='body2'>
                          <strong>Plan:</strong> {note.plan}
                        </Typography>
                      )}
                    </div>
                  ))}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </CardContent>
    </Card>
  );
}
