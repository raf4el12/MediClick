'use client';

import { useQuery } from '@tanstack/react-query';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { appointmentsService } from '@/services/appointments.service';
import { paymentsService } from '@/services/payments.service';
import { formatPrice } from '@/views/booking/format';
import { PAYMENT_METHOD_LABELS } from '@/views/payment/labels';
import { DetailList, PrintableLayout, PrintableMessage, appointmentWhen } from './PrintableLayout';

/** Comprobante de pago de una cita: sus transacciones aprobadas (seña y saldo). */
export function ReceiptPreview({ appointmentId }: { appointmentId: number }) {
  const appointmentQuery = useQuery({
    queryKey: ['patient', 'appointment', appointmentId],
    queryFn: () => appointmentsService.getMyAppointment(appointmentId),
    retry: false,
  });
  const receiptsQuery = useQuery({
    queryKey: ['patient', 'receipts', appointmentId],
    queryFn: () => paymentsService.getReceipts(appointmentId),
    enabled: appointmentQuery.isSuccess,
    retry: false,
  });

  if (appointmentQuery.isLoading || receiptsQuery.isLoading) return <CircularProgress aria-label='Cargando el comprobante' />;
  if (appointmentQuery.isError || !appointmentQuery.data) return <PrintableMessage>No encontramos esta cita.</PrintableMessage>;

  const appointment = appointmentQuery.data;
  const receipts = receiptsQuery.data ?? [];
  const timezone = appointment.timezone;
  const currencies = new Set(receipts.map((r) => r.currency));
  const total = receipts.reduce((sum, r) => sum + r.amount, 0);
  const paidAt = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(iso)) : '—';

  return (
    <PrintableLayout title='Comprobante de pago' reference={`Cita #${appointment.id}`} appointment={appointment}>
      <DetailList
        items={[
          ['Paciente', `${appointment.patient.name} ${appointment.patient.lastName}`],
          ['Médico', `${appointment.schedule.doctor.name} ${appointment.schedule.doctor.lastName}`],
          ['Especialidad', appointment.schedule.specialty.name],
          ['Fecha', appointmentWhen(appointment)],
        ]}
      />

      {receipts.length === 0 ? (
        <Typography color='text.secondary'>Esta cita todavía no tiene pagos aprobados.</Typography>
      ) : (
        <div className='overflow-x-auto rounded' style={{ border: '1px solid var(--mui-palette-divider)' }}>
          <table className='is-full text-start' style={{ borderCollapse: 'collapse' }}>
            <caption className='sr-only'>Pagos aprobados de la cita</caption>
            <thead>
              <tr>
                {['Fecha de pago', 'Medio de pago', 'Operación', 'Monto'].map((h) => (
                  <th key={h} scope='col' className='p-4 text-start text-sm font-medium' style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td className='p-4'>{paidAt(r.paidAt)}</td>
                  <td className='p-4'>{r.paymentMethod ? PAYMENT_METHOD_LABELS[r.paymentMethod] : '—'}</td>
                  <td className='p-4'>{r.gatewayId ?? '—'}</td>
                  <td className='p-4'>{formatPrice(r.amount, r.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {receipts.length > 0 && currencies.size === 1 && (
        <div className='flex justify-end gap-4'>
          <Typography className='font-medium'>Total pagado</Typography>
          <Typography className='font-medium' color='text.primary'>
            {formatPrice(total, receipts[0]!.currency)}
          </Typography>
        </div>
      )}

      <Typography variant='body2' color='text.secondary'>
        Constancia de pago; no es un documento fiscal.
      </Typography>
    </PrintableLayout>
  );
}
