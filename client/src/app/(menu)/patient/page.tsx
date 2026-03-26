import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import PatientDashboardView from '@/views/patient/dashboard';

export default function PatientDashboardPage() {
  return (
    <RoleGuard roles={[UserRole.PATIENT]}>
      <PatientDashboardView />
    </RoleGuard>
  );
}
