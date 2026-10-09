'use client';

// PROTOTIPO UI-10 — Inicio del paciente en tres variantes.
//   A — Tablero: saludo, 4 indicadores, próxima cita destacada con acciones y citas recientes.
//   B — Pendientes primero: lista de lo que hay que hacer (pagar, oferta, reseñar) y agenda.
//   C — Celular primero: próxima cita con el código de llegada a la vista y accesos rápidos.

import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import {
  appointments,
  actionsFor,
  awaitingPayment,
  minutesLeft,
  nextAppointment,
  offers,
  patientName,
  pendingReviews,
  waitlist,
  type ProtoAppointment,
} from '@/views/patient/appointments/prototype/fixtures';
import { ActionButton, FakeQr, StatePanel, StatusChips, deadlineText, price, useActionDialogs, when } from '@/views/patient/appointments/prototype/widgets';

const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;

function Stat({ icon, color, title, value, subtitle }: { icon: string; color: 'primary' | 'warning' | 'success' | 'info'; title: string; value: string; subtitle: string }) {
  return (
    <Card>
      <CardContent className='flex justify-between gap-2'>
        <div className='flex flex-col gap-1'>
          <Typography color='text.primary'>{title}</Typography>
          <Typography variant='h4'>{value}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {subtitle}
          </Typography>
        </div>
        <CustomAvatar color={color} skin='light' variant='rounded' size={42}>
          <i className={`${icon} text-[26px]`} />
        </CustomAvatar>
      </CardContent>
    </Card>
  );
}

function NextAppointmentCard({ a, run }: { a: ProtoAppointment; run: ReturnType<typeof useActionDialogs>['run'] }) {
  return (
    <Card>
      <CardHeader title='Tu próxima cita' subheader={when(a)} action={<StatusChips a={a} />} />
      <CardContent className='flex flex-col gap-4'>
        <div className='flex items-center gap-3'>
          <Avatar>{a.doctor[0]}</Avatar>
          <div>
            <Typography className='font-medium' color='text.primary'>
              {a.specialty} con {a.doctor}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {a.clinic.name} · {a.clinic.address}
            </Typography>
          </div>
        </div>
        {a.pendingUntil && <Alert severity='warning'>{deadlineText(a)}</Alert>}
        <div className='flex flex-wrap gap-2'>
          {actionsFor(a).map((action, i) => (
            <ActionButton key={action} action={action} variant={i === 0 ? 'contained' : 'outlined'} onClick={() => run(action, a)} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function HomeA() {
  const { run, dialog } = useActionDialogs({ warnPenalty: true });
  const next = nextAppointment();
  const toPay = awaitingPayment();
  const recent = appointments.filter((a) => a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'NO_SHOW').slice(0, 4);

  return (
    <div className='flex flex-col gap-6'>
      <Card>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <Typography variant='h4' component='h1'>
              Hola, {patientName} 👋
            </Typography>
            <Typography color='text.secondary'>Tienes {toPay.length} pagos pendientes y una oferta de cupo vigente.</Typography>
          </div>
          <Button component={Link} href='/patient/book' variant='contained' startIcon={<i className='ri-add-line' />}>
            Reservar cita
          </Button>
        </CardContent>
      </Card>
      <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
        <Stat icon='ri-calendar-check-line' color='primary' title='Próximas citas' value={String(appointments.filter((a) => (a.status === 'PENDING' || a.status === 'CONFIRMED')).length)} subtitle='En todas tus sedes' />
        <Stat icon='ri-bank-card-line' color='warning' title='Por pagar' value={String(toPay.length)} subtitle={toPay[0]?.pendingUntil ? `La primera vence en ${minutesLeft(toPay[0].pendingUntil)} min` : 'Sin plazos'} />
        <Stat icon='ri-star-line' color='info' title='Reseñas pendientes' value={String(pendingReviews().length)} subtitle='De citas completadas' />
        <Stat icon='ri-checkbox-circle-line' color='success' title='Completadas' value={String(completedCount)} subtitle='Desde que te registraste' />
      </div>
      <div className='grid gap-6 lg:grid-cols-[3fr_2fr]'>
        {next && <NextAppointmentCard a={next} run={run} />}
        <Card>
          <CardHeader title='Recientes' />
          <CardContent className='flex flex-col gap-4'>
            {recent.map((a) => (
              <div key={a.id} className='flex items-center justify-between gap-3'>
                <div>
                  <Typography color='text.primary'>{a.specialty}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {a.date} · {a.clinic.city}
                  </Typography>
                </div>
                <StatusChips a={a} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {dialog}
      <StatePanel state={{ variant: 'A', next: next?.id, toPay: toPay.map((a) => a.id), reviews: pendingReviews().map((a) => a.id) }} />
    </div>
  );
}

export function HomeB() {
  const { run, dialog } = useActionDialogs();
  const toPay = awaitingPayment();
  const reviews = pendingReviews();
  const upcoming = appointments
    .filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS')
    .sort((x, y) => `${x.date}${x.start}`.localeCompare(`${y.date}${y.start}`));

  const tasks = [
    ...offers.map((o) => ({
      key: `o${o.id}`,
      icon: 'ri-flashlight-line',
      color: 'info' as const,
      title: `Oferta de cupo: ${o.specialty} con ${o.doctor}`,
      detail: `${o.date} a las ${o.start} en ${o.clinic.name}. Vence en ${minutesLeft(o.expiresAt)} min.`,
      cta: 'Aceptar oferta',
      onClick: () => undefined,
    })),
    ...toPay.map((a) => ({
      key: `p${a.id}`,
      icon: 'ri-bank-card-line',
      color: 'warning' as const,
      title: `Pagar ${a.specialty} (${price(a, a.amount - a.paidAmount)})`,
      detail: a.pendingUntil ? (deadlineText(a) ?? '') : 'Saldo pendiente de tu cita con seña.',
      cta: 'Pagar',
      onClick: () => run('pay', a),
    })),
    ...reviews.map((a) => ({
      key: `r${a.id}`,
      icon: 'ri-star-line',
      color: 'primary' as const,
      title: `Cuéntanos cómo te fue con ${a.doctor}`,
      detail: `${a.specialty} del ${a.date}.`,
      cta: 'Dejar reseña',
      onClick: () => run('review', a),
    })),
  ];

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1'>
          Hola, {patientName}
        </Typography>
        <Typography color='text.secondary'>Esto es lo que tienes pendiente.</Typography>
      </div>
      <div className='grid gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader title='Pendientes' subheader={`${tasks.length} cosas por hacer`} />
          <CardContent className='flex flex-col gap-3'>
            {tasks.map((t) => (
              <div key={t.key} className='flex items-start gap-3 p-3 rounded' style={{ border: '1px solid var(--mui-palette-divider)' }}>
                <CustomAvatar color={t.color} skin='light' size={36}>
                  <i className={t.icon} />
                </CustomAvatar>
                <div className='flex-1 min-is-0'>
                  <Typography className='font-medium' color='text.primary'>
                    {t.title}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {t.detail}
                  </Typography>
                </div>
                <Button size='small' variant='contained' onClick={t.onClick}>
                  {t.cta}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title='Agenda' subheader='Próximas citas en todas tus sedes' />
          <CardContent>
            <ol className='flex flex-col gap-4 m-0 p-0 list-none'>
              {upcoming.map((a) => (
                <li key={a.id} className='flex gap-3'>
                  <div className='flex flex-col items-center min-is-[52px]'>
                    <Typography variant='caption' color='text.secondary'>
                      {a.date.slice(5)}
                    </Typography>
                    <Typography className='font-medium'>{a.start}</Typography>
                  </div>
                  <div className='flex-1'>
                    <Typography color='text.primary'>
                      {a.specialty} · {a.doctor}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {a.clinic.name} ({a.clinic.city})
                    </Typography>
                    <StatusChips a={a} />
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
      {dialog}
      <StatePanel state={{ variant: 'B', tasks: tasks.map((t) => t.key), upcoming: upcoming.map((a) => a.id) }} />
    </div>
  );
}

export function HomeC() {
  const { run, dialog } = useActionDialogs({ warnPenalty: true });
  const next = nextAppointment();
  const toPay = awaitingPayment();
  const quick = [
    { href: '/patient/book', icon: 'ri-add-circle-line', label: 'Reservar' },
    { href: '/patient/appointments', icon: 'ri-calendar-check-line', label: 'Mis citas' },
    { href: '/patient/waitlist', icon: 'ri-time-line', label: `Lista de espera (${waitlist.length})` },
    { href: '/patient/expediente', icon: 'ri-file-chart-line', label: 'Expediente' },
  ];

  return (
    <div className='flex flex-col gap-4 max-is-[720px] mli-auto'>
      <Typography variant='h5' component='h1'>
        Hola, {patientName}
      </Typography>
      {offers.map((o) => (
        <Alert key={o.id} severity='info' action={<Button size='small'>Ver</Button>}>
          Hay un cupo para {o.specialty}: {o.date} a las {o.start}. Vence en {minutesLeft(o.expiresAt)} min.
        </Alert>
      ))}
      {toPay.length > 0 && (
        <Alert severity='warning' action={<Button size='small' onClick={() => run('pay', toPay[0]!)}>Pagar</Button>}>
          {toPay.length} citas esperan tu pago.
        </Alert>
      )}
      {next && (
        <Card>
          <CardContent className='flex flex-col sm:flex-row items-center gap-6'>
            <div className='flex flex-col items-center gap-1'>
              <FakeQr size={140} />
              <Typography variant='caption' color='text.secondary'>
                Muéstralo al llegar
              </Typography>
            </div>
            <div className='flex flex-col gap-2 flex-1'>
              <Typography variant='overline' color='text.secondary'>
                Próxima cita
              </Typography>
              <Typography variant='h5'>{next.specialty}</Typography>
              <Typography color='text.primary'>{when(next)}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {next.doctor} · {next.clinic.name}
              </Typography>
              <div className='flex flex-wrap gap-2 mbs-2'>
                {actionsFor(next)
                  .filter((x) => x !== 'checkInQr')
                  .map((action) => (
                    <ActionButton key={action} action={action} onClick={() => run(action, next)} />
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className='grid grid-cols-2 gap-3'>
        {quick.map((q) => (
          <Card key={q.href} component={Link} href={q.href} className='no-underline'>
            <CardContent className='flex flex-col items-center gap-2 text-center'>
              <i className={`${q.icon} text-3xl`} style={{ color: 'var(--mui-palette-primary-main)' }} />
              <Typography color='text.primary'>{q.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </div>
      {dialog}
      <StatePanel state={{ variant: 'C', next: next?.id, toPay: toPay.map((a) => a.id) }} />
    </div>
  );
}
