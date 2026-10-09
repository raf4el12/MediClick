import { Suspense } from 'react';
import { RoleGuard } from '@/components/shared/RoleGuard';
import DoctorDashboardView from '@/views/doctor';
// PROTOTIPO UI-14: con `?variant=` se muestran las variantes de la jornada.
import JornadaPrototype from '@/views/doctor/prototype-jornada/JornadaPrototype';

export default async function DoctorPage({ searchParams }: { searchParams: Promise<{ variant?: string }> }) {
  const { variant } = await searchParams;

  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'APPOINTMENTS' }]}>
      {variant ? (
        <Suspense>
          <JornadaPrototype />
        </Suspense>
      ) : (
        <DoctorDashboardView />
      )}
    </RoleGuard>
  );
}
