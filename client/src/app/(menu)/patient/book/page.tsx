import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import PatientBookView from '@/views/patient/book';

export default function PatientBookPage() {
  return (
    <RoleGuard roles={[UserRole.PATIENT]}>
      <PatientBookView />
    </RoleGuard>
  );
}
