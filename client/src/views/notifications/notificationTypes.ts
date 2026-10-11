import type { ThemeColor } from '@core/types';
import { NotificationType } from './types';

/** Ícono, color y etiqueta de cada tipo de notificación (desplegable y página). */
export const NOTIFICATION_TYPE: Record<NotificationType, { icon: string; color: ThemeColor; label: string }> = {
  [NotificationType.APPOINTMENT_CONFIRMED]: { icon: 'ri-check-double-line', color: 'success', label: 'Cita confirmada' },
  [NotificationType.APPOINTMENT_CANCELLED]: { icon: 'ri-close-circle-line', color: 'error', label: 'Cita cancelada' },
  [NotificationType.APPOINTMENT_REMINDER]: { icon: 'ri-alarm-line', color: 'warning', label: 'Recordatorio' },
  [NotificationType.APPOINTMENT_RESCHEDULED]: { icon: 'ri-calendar-event-line', color: 'info', label: 'Cita reagendada' },
  [NotificationType.NEW_APPOINTMENT]: { icon: 'ri-calendar-check-line', color: 'primary', label: 'Nueva cita' },
  [NotificationType.GENERAL]: { icon: 'ri-information-line', color: 'secondary', label: 'General' },
};

export const typeOf = (type: string) => NOTIFICATION_TYPE[type as NotificationType] ?? NOTIFICATION_TYPE[NotificationType.GENERAL];
