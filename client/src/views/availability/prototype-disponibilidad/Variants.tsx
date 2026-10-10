'use client';

// PROTOTIPO UI-17 — Disponibilidad visual en tres variantes.
//   A — Calendario semanal con cupos y citas; seleccionar un rango abre un drawer para crear un
//       bloqueo y los bloqueos se mueven o estiran arrastrándolos. Pestañas Calendario | Reglas | Feriados.
//   B — Grilla semanal de reglas editable por arrastre arriba y calendario de restricciones abajo;
//       un solo "Guardar" aplica el reemplazo.
//   C — Mes con feriados y bloqueos como protagonistas y panel lateral con la lista de
//       restricciones; las reglas viven en una pantalla de configuración aparte.

import { useMemo, useState } from 'react';
import type { DateSelectArg, EventChangeArg, EventInput } from '@fullcalendar/core';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import FormControlLabel from '@mui/material/FormControlLabel';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { toAgendaEvents } from '@/views/agenda/model/toAgendaEvents';
import type { AgendaBlock } from '@/views/agenda/types';
import {
  MONDAY,
  TODAY,
  addDays,
  blocks as initialBlocks,
  dayTitle,
  doctor,
  holidays,
  impactOf,
  impactOfRules,
  initialRules,
  snapshotFor,
  specialtyName,
  type RestrictionDraft,
  type Rule,
} from './fixtures';
import { BlockForm, ImpactList, ProtoCalendar, RulesForm, StatePanel } from './widgets';

const day = (d: Date) => d.toISOString().slice(0, 10);
const hhmm = (d: Date) => d.toISOString().slice(11, 16);

/** Rango del calendario (UTC = hora de la sede) a borrador de bloqueo. */
const draftFromRange = (start: Date, end: Date, allDay: boolean): RestrictionDraft =>
  allDay
    ? { type: 'FULL_DAY', startDate: day(start), endDate: addDays(day(end), -1), timeFrom: null, timeTo: null }
    : { type: 'TIME_RANGE', startDate: day(start), endDate: day(start), timeFrom: hhmm(start), timeTo: hhmm(end) };

const blockFromDraft = (id: number, draft: RestrictionDraft, reason: string): AgendaBlock => ({ id, doctorId: doctor.id, reason: reason || 'Bloqueo', ...draft });

/** Drawer de creación de bloqueo con la vista previa de impacto (patrón AddEventSidebar). */
function BlockDrawer({ draft, onClose, onConfirm }: { draft: RestrictionDraft | null; onClose: () => void; onConfirm: (d: RestrictionDraft, reason: string) => void }) {
  const [value, setValue] = useState<RestrictionDraft | null>(draft);
  const [reason, setReason] = useState('');
  const [prev, setPrev] = useState(draft);
  if (draft !== prev) {
    setPrev(draft);
    setValue(draft);
    setReason('');
  }

  return (
    <Drawer anchor='right' open={!!draft} onClose={onClose} slotProps={{ paper: { className: 'is-[460px] max-is-full' } }}>
      {value && (
        <div className='flex flex-col gap-5 p-6'>
          <div>
            <Typography variant='h5' component='h2'>
              Nuevo bloqueo de agenda
            </Typography>
            <Typography color='text.secondary'>{doctor.fullName} · hora de la sede</Typography>
          </div>
          <BlockForm draft={value} reason={reason} onChange={setValue} onReason={setReason} />
          <Divider />
          <Typography variant='h6'>Citas afectadas</Typography>
          <ImpactList appointments={impactOf(value)} />
          <div className='flex gap-2'>
            <Button variant='contained' onClick={() => onConfirm(value, reason)}>
              Crear bloqueo
            </Button>
            <Button variant='outlined' onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function RulesConfirmDialog({ open, rules, onClose, onConfirm }: { open: boolean; rules: Rule[]; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Guardar reglas de disponibilidad</DialogTitle>
      <DialogContent className='flex flex-col gap-3'>
        <Typography>
          Se reemplazan las reglas de {doctor.fullName} y se regeneran sus cupos libres. Las citas reservadas no se cancelan: si quedan fuera de las nuevas reglas, conservan su cupo.
        </Typography>
        <ImpactList appointments={impactOfRules(rules)} verb='quedan fuera de las nuevas reglas' empty='Ninguna cita próxima queda fuera de las nuevas reglas.' cancels={false} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Volver</Button>
        <Button variant='contained' onClick={onConfirm}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function HolidayYear({ onSeed }: { onSeed: () => void }) {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap gap-2'>
        <Button variant='contained' startIcon={<i className='ri-add-line' />}>
          Nuevo feriado
        </Button>
        <Button variant='outlined' onClick={onSeed}>
          Cargar feriados de Perú
        </Button>
      </div>
      <ul className='flex flex-col gap-2 m-0 p-0 list-none'>
        {holidays.map((h) => (
          <li key={h.id} className='flex flex-wrap items-center gap-3 p-3 rounded' style={{ border: '1px solid var(--mui-palette-divider)' }}>
            <Typography className='font-medium is-48'>{dayTitle(h.date)}</Typography>
            <Typography className='flex-1'>{h.name}</Typography>
            <Chip size='small' variant='outlined' label={h.scope === 'GLOBAL' ? 'Global' : 'De la sede'} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────── Variante A ───────────────────────────────

export function VariantA() {
  const [tab, setTab] = useState<'calendar' | 'rules' | 'holidays'>('calendar');
  const [rules, setRules] = useState(initialRules);
  const [blockList, setBlockList] = useState<AgendaBlock[]>(initialBlocks);
  const [draft, setDraft] = useState<RestrictionDraft | null>(null);
  const [pendingMove, setPendingMove] = useState<{ info: EventChangeArg; draft: RestrictionDraft; id: number } | null>(null);
  const [confirmRules, setConfirmRules] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const events = useMemo(() => {
    const snapshot = { ...snapshotFor(rules), blocks: blockList };
    const base = toAgendaEvents({ ...snapshot, cupos: snapshotFor(rules, blockList.filter((b) => b.id > 100)).cupos }, { showFreeCupos: true });
    // Los bloqueos se pintan como eventos (no fondo) para poder moverlos y estirarlos.
    return base.map((e): EventInput =>
      e.extendedProps.kind === 'block'
        ? { ...e, display: 'auto', editable: true, durationEditable: true, backgroundColor: 'var(--mui-palette-action-selected)', borderColor: 'var(--mui-palette-divider)', textColor: 'var(--mui-palette-text-primary)' }
        : e,
    );
  }, [rules, blockList]);

  const handleChange = (info: EventChangeArg) => {
    const props = info.event.extendedProps as { kind: string; blockId: number };
    if (props.kind !== 'block' || !info.event.start || !info.event.end) return info.revert();
    setPendingMove({ info, id: props.blockId, draft: draftFromRange(info.event.start, info.event.end, info.event.allDay) });
  };

  return (
    <div className='flex flex-col gap-4'>
      <div>
        <Typography variant='h4' component='h1'>
          Disponibilidad
        </Typography>
        <Typography color='text.secondary'>{doctor.fullName} · Medicina General y Cardiología</Typography>
      </div>
      {notice && (
        <Alert severity='success' onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} className='pli-4'>
          <Tab value='calendar' label='Calendario' />
          <Tab value='rules' label='Reglas' />
          <Tab value='holidays' label='Feriados' />
        </Tabs>
        <CardContent>
          {tab === 'calendar' && (
            <div className='flex flex-col gap-3'>
              <Typography variant='body2' color='text.secondary'>
                Selecciona un rango para bloquear la agenda. Arrastra un bloqueo para moverlo o estira su borde para cambiar su duración.
              </Typography>
              <ProtoCalendar
                initialView='timeGridWeek'
                initialDate={MONDAY}
                headerToolbar={{ start: 'prev,next today title', end: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                events={events}
                selectable
                selectMirror
                select={(info: DateSelectArg) => setDraft(draftFromRange(info.start, info.end, info.allDay))}
                eventDrop={handleChange}
                eventResize={handleChange}
              />
            </div>
          )}
          {tab === 'rules' && (
            <div className='flex flex-col gap-4'>
              <Typography variant='body2' color='text.secondary'>
                Franjas semanales por especialidad. Al guardar se regeneran los cupos libres.
              </Typography>
              <RulesForm rules={rules} onChange={setRules} />
              <Button variant='contained' className='self-start' onClick={() => setConfirmRules(true)}>
                Guardar reglas
              </Button>
            </div>
          )}
          {tab === 'holidays' && <HolidayYear onSeed={() => setNotice('Se cargaron los feriados nacionales de Perú del año.')} />}
        </CardContent>
      </Card>
      <BlockDrawer
        draft={draft}
        onClose={() => setDraft(null)}
        onConfirm={(d, reason) => {
          setBlockList((list) => [...list, blockFromDraft(Date.now() % 100000 + 1000, d, reason)]);
          setNotice(`Bloqueo creado. ${impactOf(d).length} citas pasan por la ruta de cancelación.`);
          setDraft(null);
        }}
      />
      <Dialog open={!!pendingMove} onClose={() => (pendingMove?.info.revert(), setPendingMove(null))} maxWidth='sm' fullWidth>
        <DialogTitle>Mover el bloqueo</DialogTitle>
        <DialogContent className='flex flex-col gap-3'>
          {pendingMove && (
            <>
              <Typography>
                Nuevo rango: {dayTitle(pendingMove.draft.startDate)}
                {pendingMove.draft.type === 'TIME_RANGE' ? `, ${pendingMove.draft.timeFrom}–${pendingMove.draft.timeTo}` : ` al ${dayTitle(pendingMove.draft.endDate)}`}
              </Typography>
              <ImpactList appointments={impactOf(pendingMove.draft)} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => (pendingMove?.info.revert(), setPendingMove(null))}>Deshacer</Button>
          <Button
            variant='contained'
            onClick={() => {
              if (pendingMove) setBlockList((list) => list.map((b) => (b.id === pendingMove.id ? { ...b, ...pendingMove.draft } : b)));
              setPendingMove(null);
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
      <RulesConfirmDialog
        open={confirmRules}
        rules={rules}
        onClose={() => setConfirmRules(false)}
        onConfirm={() => {
          setConfirmRules(false);
          setNotice('Reglas guardadas. Se regeneraron los cupos libres.');
        }}
      />
      <StatePanel state={{ variant: 'A', tab, rules: rules.length, bloqueos: blockList.map((b) => `${b.reason} ${b.startDate}${b.timeFrom ? ` ${b.timeFrom}-${b.timeTo}` : ''}`), draft }} />
    </div>
  );
}

// ─────────────────────────────── Variante B ───────────────────────────────

const SPECIALTY_COLOR: Record<number, string> = { 1: 'primary', 2: 'info' };

export function VariantB() {
  const [rules, setRules] = useState(initialRules);
  const [newRange, setNewRange] = useState<{ dayIndex: number; timeFrom: string; timeTo: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(rules) !== JSON.stringify(initialRules) && !saved;

  const ruleEvents: EventInput[] = rules.map((r) => ({
    id: String(r.id),
    title: specialtyName(r.specialtyId),
    start: `${addDays(MONDAY, r.dayIndex)}T${r.timeFrom}:00`,
    end: `${addDays(MONDAY, r.dayIndex)}T${r.timeTo}:00`,
    backgroundColor: `var(--mui-palette-${SPECIALTY_COLOR[r.specialtyId]}-lightOpacity)`,
    borderColor: `var(--mui-palette-${SPECIALTY_COLOR[r.specialtyId]}-main)`,
    textColor: 'var(--mui-palette-text-primary)',
    editable: true,
  }));

  const moveRule = (info: EventChangeArg) => {
    const start = info.event.start!;
    const end = info.event.end!;
    setSaved(false);
    setRules((list) =>
      list.map((r) => (String(r.id) === info.event.id ? { ...r, dayIndex: (start.getUTCDay() + 6) % 7, timeFrom: hhmm(start), timeTo: hhmm(end) } : r)),
    );
  };

  const restrictionEvents = useMemo(() => toAgendaEvents(snapshotFor(rules)), [rules]);

  return (
    <div className='flex flex-col gap-4 pbe-20'>
      <div>
        <Typography variant='h4' component='h1'>
          Disponibilidad
        </Typography>
        <Typography color='text.secondary'>{doctor.fullName}</Typography>
      </div>
      <Card>
        <CardHeader
          title='Reglas semanales'
          subheader='Arrastra una franja para moverla, estira su borde para cambiar la hora o selecciona un hueco para agregar otra.'
          action={
            <div className='flex gap-2 pie-2'>
              {doctor.specialties.map((s) => (
                <Chip key={s.id} size='small' variant='tonal' color={SPECIALTY_COLOR[s.id] as 'primary' | 'info'} label={s.name} />
              ))}
            </div>
          }
        />
        <CardContent>
          <ProtoCalendar
            initialView='timeGridWeek'
            initialDate={MONDAY}
            headerToolbar={false}
            dayHeaderFormat={{ weekday: 'long' }}
            allDaySlot={false}
            slotMinTime='07:00:00'
            slotMaxTime='20:00:00'
            contentHeight='auto'
            events={ruleEvents}
            eventDrop={moveRule}
            eventResize={moveRule}
            selectable
            select={(info: DateSelectArg) => setNewRange({ dayIndex: (info.start.getUTCDay() + 6) % 7, timeFrom: hhmm(info.start), timeTo: hhmm(info.end) })}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader title='Restricciones y citas' subheader='Bloqueos, feriados y citas del mes con los cupos que generan las reglas de arriba.' />
        <CardContent>
          <ProtoCalendar initialView='dayGridMonth' initialDate={TODAY} headerToolbar={{ start: 'prev,next today title', end: '' }} events={restrictionEvents} dayMaxEvents={3} />
        </CardContent>
      </Card>
      <div
        className='fixed inset-inline-0 bottom-0 z-10 flex items-center justify-end gap-3 pli-6 plb-3'
        style={{ background: 'var(--mui-palette-background-paper)', borderBlockStart: '1px solid var(--mui-palette-divider)', insetInlineStart: 0, insetInlineEnd: 0 }}
      >
        <Typography color='text.secondary'>{dirty ? 'Hay cambios sin guardar en las reglas.' : 'Sin cambios.'}</Typography>
        <Button variant='contained' disabled={!dirty} onClick={() => setConfirm(true)}>
          Guardar
        </Button>
      </div>
      <Dialog open={!!newRange} onClose={() => setNewRange(null)}>
        <DialogTitle>Nueva franja</DialogTitle>
        <DialogContent>
          {newRange && (
            <Typography>
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][newRange.dayIndex]}, {newRange.timeFrom}–{newRange.timeTo}. ¿Para qué especialidad?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {doctor.specialties.map((s) => (
            <Button
              key={s.id}
              onClick={() => {
                if (newRange) setRules((list) => [...list, { ...initialRules[0]!, ...newRange, id: Date.now(), specialtyId: s.id }]);
                setSaved(false);
                setNewRange(null);
              }}
            >
              {s.name}
            </Button>
          ))}
        </DialogActions>
      </Dialog>
      <RulesConfirmDialog
        open={confirm}
        rules={rules}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          setSaved(true);
        }}
      />
      <StatePanel state={{ variant: 'B', rules: rules.map((r) => `${r.dayIndex} ${r.timeFrom}-${r.timeTo} ${specialtyName(r.specialtyId)}`), dirty }} />
    </div>
  );
}

// ─────────────────────────────── Variante C ───────────────────────────────

export function VariantC() {
  const [screen, setScreen] = useState<'calendar' | 'rules'>('calendar');
  const [rules, setRules] = useState(initialRules);
  const [blockList, setBlockList] = useState<AgendaBlock[]>(initialBlocks);
  const [show, setShow] = useState({ holidays: true, blocks: true, appointments: false });
  const [draft, setDraft] = useState<RestrictionDraft | null>(null);
  const [confirmRules, setConfirmRules] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const events = useMemo(() => {
    const out: EventInput[] = [];
    if (show.holidays)
      holidays.forEach((h) =>
        out.push({ id: `f${h.id}`, title: `${h.name}${h.scope === 'GLOBAL' ? '' : ' (sede)'}`, start: h.date, allDay: true, backgroundColor: 'var(--mui-palette-info-lightOpacity)', borderColor: 'transparent', textColor: 'var(--mui-palette-text-primary)' }),
      );
    if (show.blocks)
      blockList.forEach((b) =>
        out.push({
          id: `b${b.id}`,
          title: b.type === 'TIME_RANGE' ? `${b.timeFrom}–${b.timeTo} ${b.reason}` : b.reason,
          start: b.startDate,
          end: addDays(b.endDate, 1),
          allDay: true,
          backgroundColor: 'var(--mui-palette-warning-lightOpacity)',
          borderColor: 'transparent',
          textColor: 'var(--mui-palette-text-primary)',
        }),
      );
    if (show.appointments) out.push(...toAgendaEvents(snapshotFor(rules)).filter((e) => e.extendedProps.kind === 'appointment'));
    return out;
  }, [show, blockList, rules]);

  if (screen === 'rules') {
    return (
      <div className='flex flex-col gap-4'>
        <Button className='self-start' startIcon={<i className='ri-arrow-left-line' />} onClick={() => setScreen('calendar')}>
          Volver al calendario
        </Button>
        <Card>
          <CardHeader title={`Reglas de disponibilidad de ${doctor.fullName}`} subheader='Franjas semanales por especialidad y vigencia.' />
          <CardContent className='flex flex-col gap-4'>
            <RulesForm rules={rules} onChange={setRules} />
            <div className='flex flex-wrap gap-2'>
              <Button variant='contained' onClick={() => setConfirmRules(true)}>
                Guardar reglas
              </Button>
              <Button variant='outlined'>Generar cupos manualmente</Button>
            </div>
          </CardContent>
        </Card>
        <RulesConfirmDialog open={confirmRules} rules={rules} onClose={() => setConfirmRules(false)} onConfirm={() => setConfirmRules(false)} />
        <StatePanel state={{ variant: 'C', screen, rules: rules.length }} />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <Typography variant='h4' component='h1'>
            Disponibilidad
          </Typography>
          <Typography color='text.secondary'>{doctor.fullName}</Typography>
        </div>
        <Button variant='outlined' startIcon={<i className='ri-settings-3-line' />} onClick={() => setScreen('rules')}>
          Configurar reglas
        </Button>
      </div>
      {notice && (
        <Alert severity='success' onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      <div className='grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] items-start'>
        <Card>
          <CardContent className='flex flex-col gap-4'>
            <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={() => setDraft({ type: 'FULL_DAY', startDate: TODAY, endDate: TODAY, timeFrom: null, timeTo: null })}>
              Nuevo bloqueo
            </Button>
            <Divider />
            <div className='flex flex-col'>
              <Typography variant='h6'>Mostrar</Typography>
              {(
                [
                  ['holidays', 'Feriados'],
                  ['blocks', 'Bloqueos de agenda'],
                  ['appointments', 'Citas'],
                ] as const
              ).map(([key, label]) => (
                <FormControlLabel key={key} label={label} control={<Checkbox checked={show[key]} onChange={(_, v) => setShow((s) => ({ ...s, [key]: v }))} />} />
              ))}
            </div>
            <Divider />
            <Typography variant='h6'>Restricciones</Typography>
            <ul className='flex flex-col gap-2 m-0 p-0 list-none'>
              {[...holidays.map((h) => ({ key: `f${h.id}`, date: h.date, title: h.name, tag: h.scope === 'GLOBAL' ? 'Feriado global' : 'Feriado de sede' })), ...blockList.map((b) => ({ key: `b${b.id}`, date: b.startDate, title: b.reason, tag: b.type === 'FULL_DAY' ? 'Bloqueo de día' : `Bloqueo ${b.timeFrom}–${b.timeTo}` }))]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((r) => (
                  <li key={r.key} className='flex flex-col gap-1 p-2 rounded' style={{ border: '1px solid var(--mui-palette-divider)' }}>
                    <Typography variant='body2' className='font-medium'>
                      {r.title}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {dayTitle(r.date)} · {r.tag}
                    </Typography>
                  </li>
                ))}
            </ul>
            <Button variant='outlined' onClick={() => setNotice('Se cargaron los feriados nacionales de Perú del año.')}>
              Cargar feriados de Perú
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <ProtoCalendar initialView='dayGridMonth' initialDate={TODAY} headerToolbar={{ start: 'prev,next today title', end: '' }} events={events} dayMaxEvents={3} />
          </CardContent>
        </Card>
      </div>
      <BlockDrawer
        draft={draft}
        onClose={() => setDraft(null)}
        onConfirm={(d, reason) => {
          setBlockList((list) => [...list, blockFromDraft(Date.now() % 100000 + 1000, d, reason)]);
          setNotice(`Bloqueo creado. ${impactOf(d).length} citas pasan por la ruta de cancelación.`);
          setDraft(null);
        }}
      />
      <StatePanel state={{ variant: 'C', screen, show, bloqueos: blockList.length }} />
    </div>
  );
}
