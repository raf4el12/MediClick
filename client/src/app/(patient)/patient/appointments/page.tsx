import { Suspense } from 'react';
import { RoleGuard } from '@/components/shared/RoleGuard';
import PatientAppointmentsView from '@/views/patient/appointments';
// PROTOTIPO UI-10: con `?variant=` se muestran las variantes de Mis citas.
import AppointmentsPrototype from '@/views/patient/appointments/prototype/AppointmentsPrototype';

export default async function PatientAppointmentsPage({ searchParams }: { searchParams: Promise<{ variant?: string }> }) {
  const { variant } = await searchParams;

  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'APPOINTMENTS' }]}>
      {variant ? (
        <Suspense>
          <AppointmentsPrototype />
        </Suspense>
      ) : (
        <PatientAppointmentsView />
      )}
    </RoleGuard>
  );
}
