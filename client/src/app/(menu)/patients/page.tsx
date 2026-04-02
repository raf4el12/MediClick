import { RoleGuard } from '@/components/shared/RoleGuard';
import PatientsView from '@/views/patients';

export default function PatientsPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'PATIENTS' }]}>
      <PatientsView />
    </RoleGuard>
  );
}
