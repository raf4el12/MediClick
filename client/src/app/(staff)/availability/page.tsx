import { Suspense } from 'react';
import { RoleGuard } from '@/components/shared/RoleGuard';
import AvailabilityView from '@/views/availability';
// PROTOTIPO UI-17: con `?variant=` se muestran las variantes de disponibilidad visual.
import DisponibilidadPrototype from '@/views/availability/prototype-disponibilidad/DisponibilidadPrototype';

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ variant?: string }> }) {
  const { variant } = await searchParams;

  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'AVAILABILITY' }]}>
      {variant ? (
        <Suspense>
          <DisponibilidadPrototype />
        </Suspense>
      ) : (
        <AvailabilityView />
      )}
    </RoleGuard>
  );
}
