import { toast } from 'react-toastify';

export type NotifySeverity = 'success' | 'error' | 'warning' | 'info';

/** Aviso breve (react-toastify, estilizado por AppReactToastify). */
export function notify(message: string, severity: NotifySeverity = 'success'): void {
  toast[severity](message);
}
