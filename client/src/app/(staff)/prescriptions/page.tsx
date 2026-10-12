import { Suspense } from 'react';
import { RoleGuard } from '@/components/shared/RoleGuard';
import PrescriptionsView from '@/views/prescriptions';

// El paciente también tiene READ:PRESCRIPTIONS (para sus propias recetas): esta vista es del personal.
export default function PrescriptionsPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'PRESCRIPTIONS' }]} actors={['DOCTOR', 'STAFF']}>
      <Suspense>
        <PrescriptionsView />
      </Suspense>
    </RoleGuard>
  );
}
