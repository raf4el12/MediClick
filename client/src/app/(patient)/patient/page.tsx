import { Suspense } from 'react';
import { RoleGuard } from '@/components/shared/RoleGuard';
import PatientDashboardView from '@/views/patient/dashboard';
// PROTOTIPO UI-10: con `?variant=` se muestran las variantes de Inicio.
import HomePrototype from '@/views/patient/dashboard/prototype/HomePrototype';

export default async function PatientDashboardPage({ searchParams }: { searchParams: Promise<{ variant?: string }> }) {
  const { variant } = await searchParams;

  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'APPOINTMENTS' }]}>
      {variant ? (
        <Suspense>
          <HomePrototype />
        </Suspense>
      ) : (
        <PatientDashboardView />
      )}
    </RoleGuard>
  );
}
