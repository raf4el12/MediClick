import { RoleGuard } from '@/components/shared/RoleGuard';
import MedicalHistoryView from '@/views/medical-history';

export default function MedicalHistoryPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'MEDICAL_HISTORY' }]}>
      <MedicalHistoryView />
    </RoleGuard>
  );
}
