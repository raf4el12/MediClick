'use client';

// PROTOTIPO UI-10 — Mis citas en tres variantes.
//   A — Tabla con pestañas (InvoiceListTable de Materio), menú de acciones y detalle en panel lateral.
//   B — Tarjetas con chips de filtro, acciones a la vista y detalle en diálogo; reagendar abre la reserva.
//   C — Línea de tiempo por mes con pestaña "Lista de espera" y detalle desplegable con historial.

import { useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import {
  ACTION_ICON,
  ACTION_LABEL,
  actionsFor,
  appointments,
  minutesLeft,
  offers,
  startsAt,
  waitlist,
  type ProtoAppointment,
} from './fixtures';
import { ActionButton, StatePanel, StatusChips, deadlineText, price, useActionDialogs, when } from './widgets';

type Filter = 'upcoming' | 'all' | 'completed' | 'cancelled';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'upcoming', label: 'Próximas' },
  { value: 'all', label: 'Todas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
];

const byFilter = (f: Filter) => (a: ProtoAppointment) =>
  f === 'all' ||
  (f === 'upcoming' && ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status)) ||
  (f === 'completed' && a.status === 'COMPLETED') ||
  (f === 'cancelled' && (a.status === 'CANCELLED' || a.status === 'NO_SHOW'));

const sorted = (list: ProtoAppointment[], f: Filter) =>
  [...list].sort((x, y) => (f === 'upcoming' ? 1 : -1) * (startsAt(x).getTime() - startsAt(y).getTime()));

function History({ a }: { a: ProtoAppointment }) {
  return (
    <ol className='flex flex-col gap-2 m-0 pis-4'>
      {a.history.map((h, i) => (
        <li key={i}>
          <Typography variant='body2' color='text.primary'>
            {h.label}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {h.at}
          </Typography>
        </li>
      ))}
    </ol>
  );
}

function Detail({ a, run }: { a: ProtoAppointment; run: ReturnType<typeof useActionDialogs>['run'] }) {
  return (
    <div className='flex flex-col gap-4'>
      <StatusChips a={a} />
      <div>
        <Typography variant='h6'>{a.specialty}</Typography>
        <Typography color='text.secondary'>{when(a)}</Typography>
      </div>
      <Typography>
        {a.doctor} · {a.clinic.name}
        <br />
        <Typography component='span' variant='body2' color='text.secondary'>
          {a.clinic.address}
        </Typography>
      </Typography>
      <Typography>
        Total {price(a)}
        {a.paidAmount > 0 && a.paidAmount < a.amount && ` · pagado ${price(a, a.paidAmount)}`}
        {a.cancellationFee && ` · penalización ${price(a, a.cancellationFee)}`}
      </Typography>
      {a.pendingUntil && <Alert severity='warning'>{deadlineText(a)}</Alert>}
      <div className='flex flex-wrap gap-2'>
        {actionsFor(a).map((action) => (
          <ActionButton key={action} action={action} onClick={() => run(action, a)} />
        ))}
      </div>
      <Divider />
      <Typography className='font-medium'>Historial</Typography>
      <History a={a} />
    </div>
  );
}

export function AppointmentsA() {
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [selected, setSelected] = useState<ProtoAppointment | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; a: ProtoAppointment } | null>(null);
  const { run, dialog } = useActionDialogs({ warnPenalty: true });
  const rows = sorted(appointments.filter(byFilter(filter)), filter);

  return (
    <Card>
      <Tabs value={filter} onChange={(_, v) => setFilter(v)} className='pli-4'>
        {FILTERS.map((f) => (
          <Tab key={f.value} value={f.value} label={f.label} />
        ))}
      </Tabs>
      <Divider />
      <div className='overflow-x-auto max-md:hidden'>
        <table className='is-full' style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className='text-start'>
              {['Fecha y hora', 'Especialidad y médico', 'Sede', 'Estado', 'Total', ''].map((h) => (
                <th key={h} className='text-start p-4 text-sm' style={{ color: 'var(--mui-palette-text-secondary)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid var(--mui-palette-divider)' }}>
                <td className='p-4'>
                  <Typography color='text.primary'>{a.date}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {a.start} ({a.clinic.city})
                  </Typography>
                </td>
                <td className='p-4'>
                  <Button variant='text' onClick={() => setSelected(a)} className='p-0 justify-start'>
                    {a.specialty}
                  </Button>
                  <Typography variant='body2' color='text.secondary'>
                    {a.doctor}
                  </Typography>
                </td>
                <td className='p-4'>
                  <Typography>{a.clinic.name}</Typography>
                </td>
                <td className='p-4'>
                  <StatusChips a={a} />
                </td>
                <td className='p-4'>
                  <Typography>{price(a)}</Typography>
                </td>
                <td className='p-4'>
                  <IconButton aria-label={`Acciones de la cita del ${a.date}`} onClick={(e) => setMenu({ el: e.currentTarget, a })}>
                    <i className='ri-more-2-line' />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* En celular la tabla pasa a tarjetas compactas. */}
      <div className='md:hidden flex flex-col'>
        {rows.map((a) => (
          <button
            key={a.id}
            type='button'
            onClick={() => setSelected(a)}
            className='text-start p-4 bg-transparent border-0 cursor-pointer'
            style={{ borderBottom: '1px solid var(--mui-palette-divider)', font: 'inherit', color: 'inherit' }}
          >
            <Typography className='font-medium'>{a.specialty}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {when(a)}
            </Typography>
            <StatusChips a={a} />
          </button>
        ))}
      </div>
      <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
        {menu &&
          actionsFor(menu.a).map((action) => (
            <MenuItem
              key={action}
              onClick={() => {
                run(action, menu.a);
                setMenu(null);
              }}
              className='gap-2'
            >
              <i className={ACTION_ICON[action]} />
              {ACTION_LABEL[action]}
            </MenuItem>
          ))}
      </Menu>
      <Drawer anchor='right' open={!!selected} onClose={() => setSelected(null)}>
        <div className='p-6 is-[380px] max-is-[100vw]'>{selected && <Detail a={selected} run={run} />}</div>
      </Drawer>
      {dialog}
      <CardContent>
        <StatePanel state={{ variant: 'A', filter, selected: selected?.id ?? null, rows: rows.map((r) => r.id) }} />
      </CardContent>
    </Card>
  );
}

export function AppointmentsB() {
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [selected, setSelected] = useState<ProtoAppointment | null>(null);
  const { run, dialog } = useActionDialogs();
  const rows = sorted(appointments.filter(byFilter(filter)), filter);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap gap-2'>
        {FILTERS.map((f) => (
          <Chip key={f.value} label={f.label} clickable color={filter === f.value ? 'primary' : 'default'} variant={filter === f.value ? 'filled' : 'outlined'} onClick={() => setFilter(f.value)} />
        ))}
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
        {rows.map((a) => (
          <Card key={a.id}>
            <CardContent className='flex flex-col gap-3'>
              <div className='flex justify-between gap-2'>
                <div>
                  <Typography variant='h6'>{a.specialty}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {a.doctor} · {a.clinic.name}
                  </Typography>
                </div>
                <StatusChips a={a} />
              </div>
              <Typography color='text.primary'>{when(a)}</Typography>
              {a.pendingUntil && <Alert severity='warning'>{deadlineText(a)}</Alert>}
              <div className='flex flex-wrap gap-2'>
                {actionsFor(a)
                  .filter((x) => x !== 'directions')
                  .map((action) =>
                    action === 'reschedule' ? (
                      <Button key={action} size='small' variant='outlined' component={Link} href={`/patient/book?reschedule=${a.id}`} startIcon={<i className={ACTION_ICON.reschedule} />}>
                        Reagendar
                      </Button>
                    ) : (
                      <ActionButton key={action} action={action} onClick={() => run(action, a)} />
                    ),
                  )}
                <Button size='small' variant='text' onClick={() => setSelected(a)}>
                  Ver detalle
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth='sm'>
        <DialogTitle>Detalle de la cita</DialogTitle>
        <DialogContent>{selected && <Detail a={selected} run={run} />}</DialogContent>
      </Dialog>
      {dialog}
      <StatePanel state={{ variant: 'B', filter, selected: selected?.id ?? null }} />
    </div>
  );
}

export function AppointmentsC() {
  const [tab, setTab] = useState<'appointments' | 'waitlist'>('appointments');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<number | null>(null);
  const { run, dialog } = useActionDialogs({ warnPenalty: true });
  const rows = sorted(appointments.filter(byFilter(filter)), 'all');
  const months = [...new Set(rows.map((a) => a.date.slice(0, 7)))];

  return (
    <Card>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} className='pli-4'>
        <Tab value='appointments' label='Citas' />
        <Tab value='waitlist' label={`Lista de espera (${waitlist.length})`} />
      </Tabs>
      <Divider />
      <CardContent className='flex flex-col gap-4'>
        {tab === 'appointments' ? (
          <>
            <div className='flex flex-wrap gap-2'>
              {FILTERS.map((f) => (
                <Chip key={f.value} label={f.label} clickable size='small' color={filter === f.value ? 'primary' : 'default'} onClick={() => setFilter(f.value)} />
              ))}
            </div>
            {months.map((m) => (
              <section key={m} className='flex flex-col gap-3'>
                <Typography variant='overline' color='text.secondary'>
                  {new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date(`${m}-15T12:00:00`))}
                </Typography>
                <ol className='flex flex-col gap-3 m-0 p-0 list-none' style={{ borderInlineStart: '2px solid var(--mui-palette-divider)' }}>
                  {rows
                    .filter((a) => a.date.startsWith(m))
                    .map((a) => (
                      <li key={a.id} className='pis-4 relative'>
                        <span className='absolute rounded-full' style={{ insetInlineStart: -7, top: 6, width: 12, height: 12, background: 'var(--mui-palette-primary-main)' }} />
                        <button
                          type='button'
                          aria-expanded={open === a.id}
                          onClick={() => setOpen(open === a.id ? null : a.id)}
                          className='flex flex-wrap items-center justify-between gap-2 is-full text-start bg-transparent border-0 cursor-pointer p-0'
                          style={{ font: 'inherit', color: 'inherit' }}
                        >
                          <span>
                            <Typography className='font-medium' component='span' display='block'>
                              {a.specialty} · {a.doctor}
                            </Typography>
                            <Typography variant='body2' color='text.secondary' component='span'>
                              {when(a)} · {a.clinic.name}
                            </Typography>
                          </span>
                          <StatusChips a={a} />
                        </button>
                        {open === a.id && (
                          <div className='mbs-3 p-4 rounded' style={{ background: 'var(--mui-palette-action-hover)' }}>
                            <Detail a={a} run={run} />
                          </div>
                        )}
                      </li>
                    ))}
                </ol>
              </section>
            ))}
          </>
        ) : (
          <div className='flex flex-col gap-3'>
            {offers.map((o) => (
              <Alert key={o.id} severity='info' action={<Button size='small'>Aceptar</Button>}>
                Oferta de cupo: {o.specialty} con {o.doctor}, {o.date} a las {o.start} ({o.clinic.name}). Vence en {minutesLeft(o.expiresAt)} min.
              </Alert>
            ))}
            {waitlist.map((w) => (
              <Card key={w.id} variant='outlined'>
                <CardContent>
                  <Typography className='font-medium'>
                    {w.specialty}
                    {w.doctor ? ` con ${w.doctor}` : ''}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {w.clinic.name} · del {w.from} al {w.to} · {w.preference}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <StatePanel state={{ variant: 'C', tab, filter, open }} />
      </CardContent>
      {dialog}
    </Card>
  );
}
