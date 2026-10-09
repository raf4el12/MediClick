import { RoleGuard } from '@/components/shared/RoleGuard';
import PatientDashboardView from '@/views/patient/dashboard';

export default function PatientDashboardPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'APPOINTMENTS' }]}>
      <PatientDashboardView />
    </RoleGuard>
  );
}
