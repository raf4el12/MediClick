import { RoleGuard } from '@/components/shared/RoleGuard';
import MedicalHistoryView from '@/views/medical-history';

// El paciente también tiene READ:MEDICAL_HISTORY (para su propio historial): esta vista es del personal.
export default function MedicalHistoryPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'MEDICAL_HISTORY' }]} actors={['DOCTOR', 'STAFF']}>
      <MedicalHistoryView />
    </RoleGuard>
  );
}
