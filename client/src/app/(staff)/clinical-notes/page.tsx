import { Suspense } from 'react';
import { RoleGuard } from '@/components/shared/RoleGuard';
import ClinicalNotesView from '@/views/clinical-notes';

// El paciente también tiene READ:CLINICAL_NOTES (para sus propias notas): esta vista es del personal.
export default function ClinicalNotesPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'CLINICAL_NOTES' }]} actors={['DOCTOR', 'STAFF']}>
      <Suspense>
        <ClinicalNotesView />
      </Suspense>
    </RoleGuard>
  );
}
