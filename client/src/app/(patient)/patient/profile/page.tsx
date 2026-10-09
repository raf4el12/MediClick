import { RoleGuard } from '@/components/shared/RoleGuard';
import PatientProfileView from '@/views/patient/profile';

export default function PatientProfilePage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'APPOINTMENTS' }]}>
      <PatientProfileView />
    </RoleGuard>
  );
}
