/** Id de la cita abierta en el drawer según `?appointmentId=`, o `null` si el valor no sirve. */
export function parseAppointmentId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);

  return id > 0 ? id : null;
}
