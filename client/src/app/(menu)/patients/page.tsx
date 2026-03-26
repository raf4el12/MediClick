import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import PatientsView from '@/views/patients';

export default function PatientsPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST]}>
      <PatientsView />
    </RoleGuard>
  );
}
