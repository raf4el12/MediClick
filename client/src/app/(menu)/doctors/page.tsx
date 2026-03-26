import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import DoctorsView from '@/views/doctors';

export default function DoctorsPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN, UserRole.RECEPTIONIST]}>
      <DoctorsView />
    </RoleGuard>
  );
}
