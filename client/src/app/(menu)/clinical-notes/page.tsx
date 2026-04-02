import { RoleGuard } from '@/components/shared/RoleGuard';
import ClinicalNotesView from '@/views/clinical-notes';

export default function ClinicalNotesPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'CLINICAL_NOTES' }]}>
      <ClinicalNotesView />
    </RoleGuard>
  );
}
