import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import PrescriptionsView from '@/views/prescriptions';

export default function PrescriptionsPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN, UserRole.DOCTOR]}>
      <PrescriptionsView />
    </RoleGuard>
  );
}
