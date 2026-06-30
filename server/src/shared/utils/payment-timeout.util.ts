/**
 * Ventana para completar el pago online antes de que la cita expire.
 * Compartida por reserva de paciente, aceptación de oferta de waitlist y
 * reagendamiento, para que el deadline de pago sea el mismo en los tres flujos.
 */
export function getAppointmentPaymentTimeoutMs(): number {
  const minutes = Number(
    process.env.APPOINTMENT_PAYMENT_TIMEOUT_MINUTES ?? '15',
  );
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 15) * 60 * 1000;
}
