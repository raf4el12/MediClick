import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import AvailabilityView from '@/views/availability';

export default function AvailabilityPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN, UserRole.DOCTOR]}>
      <AvailabilityView />
    </RoleGuard>
  );
}
