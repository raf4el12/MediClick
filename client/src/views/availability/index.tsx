'use client';

import { useCallback, useMemo, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import type { AppointmentStatus } from '@/views/appointments/types';
import AgendaCalendar from '@/views/agenda/components/AgendaCalendar';
import AgendaFilters from '@/views/agenda/components/AgendaFilters';
import { ALL_STATUSES } from '@/views/agenda/status';
import type { AgendaBlock, AgendaScope, AgendaSnapshot } from '@/views/agenda/types';
import BlockDrawer from './components/BlockDrawer';
import WeeklyRulesEditor from './components/WeeklyRulesEditor';
import { useDoctorOptions } from './hooks/useAvailability';
import type { BlockDraft } from './types/restrictions';

const ALL = 'all';
const SELF = {};
const CLINIC_VIEWS = ['timeGridWeek', 'timeGridDay', 'listWeek'] as const;

const day = (d: Date) => d.toISOString().slice(0, 10);
const hhmm = (d: Date) => d.toISOString().slice(11, 16);
const minusDay = (d: Date) => day(new Date(d.getTime() - 86_400_000));

/** Selección del calendario (UTC = hora de la sede) → borrador de bloqueo. */
const draftFromRange = ({ start, end, allDay }: { start: Date; end: Date; allDay: boolean }): BlockDraft =>
  allDay
    ? { type: 'FULL_DAY', startDate: day(start), endDate: minusDay(end), timeFrom: '08:00', timeTo: '12:00', reason: '' }
    : { type: 'TIME_RANGE', startDate: day(start), endDate: day(start), timeFrom: hhmm(start), timeTo: hhmm(end), reason: '' };

const draftFromBlock = (b: AgendaBlock): BlockDraft => ({
  id: b.id,
  type: b.type,
  startDate: b.startDate,
  endDate: b.endDate,
  timeFrom: b.timeFrom ?? '08:00',
  timeTo: b.timeTo ?? '12:00',
  reason: b.reason,
});

/**
 * Disponibilidad de un médico sobre su agenda (UI-17, variante A): calendario con cupos, citas y
 * bloqueos, y reglas semanales en formulario. Recepción y administración editan; el médico solo mira.
 */
export default function AvailabilityView() {
  const user = useAppSelector(selectUser);
  const { hasPermission } = usePermissions();
  const timezone = user?.clinicTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const canPickDoctor = hasPermission('READ', 'DOCTORS');
  const canEditBlocks = hasPermission('MANAGE', 'SCHEDULE_BLOCKS');
  const canEditRules = hasPermission('MANAGE', 'AVAILABILITY');
  const doctors = useDoctorOptions(canPickDoctor);

  const [tab, setTab] = useState<'calendar' | 'rules'>('calendar');
  const [choice, setChoice] = useState<number | typeof ALL | ''>('');
  const [specialtyId, setSpecialtyId] = useState<number | ''>('');
  const [statuses, setStatuses] = useState<AppointmentStatus[]>(ALL_STATUSES);
  const [showFreeCupos, setShowFreeCupos] = useState(true);
  const [snapshot, setSnapshot] = useState<AgendaSnapshot | null>(null);
  const [draft, setDraft] = useState<BlockDraft | null>(null);
  const onSnapshot = useCallback((s: AgendaSnapshot) => setSnapshot(s), []);

  // El médico ve su propia agenda (alcance vacío); recepción elige médico o toda la sede.
  const clinicView = choice === ALL;
  const doctorId = canPickDoctor ? (typeof choice === 'number' ? choice : null) : (snapshot?.doctors[0]?.id ?? null);
  const scope: AgendaScope | null = !canPickDoctor ? SELF : clinicView ? SELF : doctorId !== null ? { doctorId } : null;

  const specialties = useMemo(() => {
    if (canPickDoctor && typeof choice === 'number') return doctors.data?.find((d) => d.id === choice)?.specialties ?? [];
    return snapshot ? snapshot.doctors.flatMap((d) => d.specialties).filter((s, i, all) => all.findIndex((x) => x.id === s.id) === i) : [];
  }, [canPickDoctor, choice, doctors.data, snapshot]);
  const doctorName = canPickDoctor
    ? (() => {
        const d = doctors.data?.find((x) => x.id === doctorId);
        return d ? `${d.profile.name} ${d.profile.lastName}` : '';
      })()
    : (snapshot?.doctors[0]?.fullName ?? '');

  const editBlocks = canEditBlocks && !clinicView && doctorId !== null;

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1'>
          Disponibilidad
        </Typography>
        <Typography color='text.secondary'>Cupos, citas, bloqueos de agenda y reglas semanales, en la hora de la sede.</Typography>
      </div>
      <Card>
        <CardContent className='flex flex-wrap items-center gap-4'>
          {canPickDoctor && (
            <TextField
              select
              id='disponibilidad-medico'
              size='small'
              label='Médico'
              value={choice}
              onChange={(e) => {
                const value = e.target.value as string | number;
                setChoice(value === ALL ? ALL : Number(value));
                setSpecialtyId('');
                setSnapshot(null);
              }}
              className='is-72'
            >
              {user?.clinicName && <MenuItem value={ALL}>Todos los médicos</MenuItem>}
              {(doctors.data ?? []).map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.profile.name} {d.profile.lastName}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select
            id='disponibilidad-especialidad'
            size='small'
            label='Especialidad'
            value={specialtyId}
            onChange={(e) => setSpecialtyId(e.target.value === '' ? '' : Number(e.target.value))}
            className='is-64'
            disabled={specialties.length === 0}
          >
            <MenuItem value=''>{tab === 'rules' ? 'Elige una especialidad' : 'Todas'}</MenuItem>
            {specialties.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          {snapshot && scope && (
            <Typography color='text.secondary' className='tabular-nums'>
              {snapshot.indicators.totalCupos} cupos ofrecidos · {snapshot.indicators.bookedCupos} reservados
            </Typography>
          )}
        </CardContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} className='pli-4' aria-label='Secciones de disponibilidad'>
          <Tab value='calendar' label='Calendario' />
          <Tab value='rules' label='Reglas' disabled={clinicView} />
        </Tabs>
      </Card>

      {tab === 'calendar' &&
        (scope ? (
          <div className='grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] items-start'>
            <Card>
              <CardContent className='flex flex-col gap-4'>
                <AgendaFilters statuses={statuses} onStatusesChange={setStatuses} showFreeCupos={showFreeCupos} onShowFreeCuposChange={setShowFreeCupos} />
                {editBlocks && (
                  <Typography variant='body2' color='text.secondary'>
                    Para bloquear la agenda, marca un rango empezando en un hueco libre o toca un día en la fila «Todo el día». Toca un bloqueo para editarlo.
                  </Typography>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <AgendaCalendar
                  key={clinicView ? ALL : String(doctorId)}
                  scope={scope}
                  views={clinicView ? [...CLINIC_VIEWS] : undefined}
                  statuses={statuses}
                  showFreeCupos={showFreeCupos}
                  specialtyId={specialtyId === '' ? undefined : specialtyId}
                  withDoctor={clinicView}
                  onSnapshot={onSnapshot}
                  onSelectRange={editBlocks ? (range) => setDraft(draftFromRange(range)) : undefined}
                  onSelectBlock={editBlocks ? (block) => setDraft(draftFromBlock(block)) : undefined}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent>
              <Typography color='text.secondary'>Elige un médico, o «Todos los médicos», para ver su agenda.</Typography>
            </CardContent>
          </Card>
        ))}

      {tab === 'rules' && (
        <Card>
          <CardContent>
            {doctorId === null ? (
              <Typography color='text.secondary'>Elige un médico para ver sus reglas.</Typography>
            ) : specialtyId === '' ? (
              <Typography color='text.secondary'>Elige una especialidad para ver y editar sus reglas.</Typography>
            ) : (
              <WeeklyRulesEditor doctorId={doctorId} specialtyId={specialtyId} timezone={timezone} readOnly={!canEditRules} />
            )}
          </CardContent>
        </Card>
      )}

      {doctorId !== null && <BlockDrawer doctorId={doctorId} doctorName={doctorName} initial={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}
