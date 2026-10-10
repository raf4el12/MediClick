import { redirect } from 'next/navigation';

// La jornada reemplazó a "Mis citas de hoy" (decisión 1 de UI-14).
export default function DoctorAppointmentsPage() {
  redirect('/doctor');
}
