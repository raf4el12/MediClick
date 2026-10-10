'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import type { DatesSetArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import { useTheme } from '@mui/material/styles';
import AppFullCalendar from '@/libs/styles/AppFullCalendar';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { extractApiError } from '@/utils/extractApiError';
import { notify } from '@/utils/notify';
import { nowInTimezone } from '@/utils/timezone';
import type { AppointmentStatus } from '@/views/appointments/types';
import { useAgenda } from '../hooks/useAgenda';
import { resolveDropTarget } from '../model/resolveDropTarget';
import type { AgendaAppointment, AgendaEventProps, AgendaScope, AgendaSnapshot, DateRange } from '../types';

export type AgendaView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';

interface AgendaCalendarProps {
  scope: AgendaScope;
  view?: AgendaView;
  statuses?: AppointmentStatus[];
  showFreeCupos?: boolean;
  onSelectAppointment?: (appointment: AgendaAppointment, agenda: AgendaSnapshot) => void;
}

const TIME_FORMAT = { hour: '2-digit', minute: '2-digit', hour12: false } as const;

const day = (d: Date) => d.toISOString().slice(0, 10);

/** El fin que entrega FullCalendar es exclusivo; `GET /agenda` espera el último día inclusive. */
const toRange = ({ start, end }: DatesSetArg): DateRange => ({
  from: day(start),
  to: day(new Date(end.getTime() - 86_400_000)),
});

/** "Ahora" en la sede expresado en campos UTC, para que "Hoy" y la línea de la hora no usen el reloj del navegador. */
const sedeNow = (tz: string) => {
  const wall = nowInTimezone(tz);

  return new Date(Date.UTC(wall.getFullYear(), wall.getMonth(), wall.getDate(), wall.getHours(), wall.getMinutes()));
};

/**
 * Agenda sobre FullCalendar. Usa `timeZone: 'UTC'` porque los eventos llegan con la hora local de
 * la sede sin offset: así se pintan tal cual, sea cual sea la zona del navegador.
 */
export default function AgendaCalendar({ scope, view = 'timeGridWeek', statuses, showFreeCupos, onSelectAppointment }: AgendaCalendarProps) {
  const theme = useTheme();
  const user = useAppSelector(selectUser);
  const rootRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<DateRange | null>(null);
  const { snapshot, events, reschedule } = useAgenda(scope, range, { statuses, showFreeCupos });
  const timezone = snapshot?.timezone ?? user?.clinicTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  // La agenda de una sede admite hasta 7 días: sin vista de mes.
  const monthAllowed = !('clinicId' in scope);
  const calendarEvents = useMemo(() => events.map((e) => ({ ...e, durationEditable: false })), [events]);

  // FullCalendar marca los íconos de anterior/siguiente como role="img" sin nombre; el botón ya
  // se nombra por su `title`, así que el ícono es decorativo.
  useEffect(() => {
    rootRef.current?.querySelectorAll('.fc-icon:not([aria-hidden])').forEach((icon) => icon.setAttribute('aria-hidden', 'true'));
  });

  const handleDatesSet = (arg: DatesSetArg) => {
    const next = toRange(arg);
    setRange((prev) => (prev?.from === next.from && prev.to === next.to ? prev : next));
  };

  const handleEventClick = ({ event, jsEvent }: EventClickArg) => {
    const props = event.extendedProps as AgendaEventProps;
    if (props.kind !== 'appointment' || !snapshot) return;
    jsEvent.preventDefault();
    const appointment = snapshot.appointments.find((a) => a.id === props.appointmentId);
    if (appointment) onSelectAppointment?.(appointment, snapshot);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const props = info.event.extendedProps as AgendaEventProps;
    const target =
      snapshot && props.kind === 'appointment' && info.event.start
        ? resolveDropTarget(snapshot, props.appointmentId, info.event.start)
        : null;
    if (!target || props.kind !== 'appointment') {
      info.revert();
      return;
    }

    try {
      await reschedule(props.appointmentId, target);
      notify('Cita reagendada');
    } catch (err) {
      info.revert();
      notify(extractApiError(err, 'No se pudo reagendar la cita').message, 'error');
    }
  };

  return (
    <AppFullCalendar ref={rootRef}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={view}
        timeZone='UTC'
        locale={esLocale}
        direction={theme.direction}
        headerToolbar={{
          start: 'prev,next today title',
          end: [monthAllowed && 'dayGridMonth', 'timeGridWeek', 'timeGridDay', 'listWeek'].filter(Boolean).join(','),
        }}
        buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Lista' }}
        buttonHints={{ prev: '$0 anterior', next: '$0 siguiente' }}
        allDayText='Todo el día'
        slotLabelFormat={TIME_FORMAT}
        eventTimeFormat={TIME_FORMAT}
        eventDisplay='block'
        views={{ dayGridMonth: { displayEventEnd: false } }}
        noEventsText='No hay citas en este rango'
        contentHeight={650}
        scrollTime='07:00:00'
        snapDuration='00:10:00'
        now={() => sedeNow(timezone)}
        nowIndicator
        dayMaxEvents={3}
        events={calendarEvents}
        eventAllow={(dropInfo, dragged) => {
          const props = dragged?.extendedProps as AgendaEventProps | undefined;
          return !!snapshot && props?.kind === 'appointment' && resolveDropTarget(snapshot, props.appointmentId, dropInfo.start) !== null;
        }}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        datesSet={handleDatesSet}
      />
    </AppFullCalendar>
  );
}
