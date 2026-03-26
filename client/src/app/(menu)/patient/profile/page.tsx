import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import PatientProfileView from '@/views/patient/profile';

export default function PatientProfilePage() {
  return (
    <RoleGuard roles={[UserRole.PATIENT]}>
      <PatientProfileView />
    </RoleGuard>
  );
}
