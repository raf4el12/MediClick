import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import HolidaysView from '@/views/holidays';

export default function HolidaysPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN]}>
      <HolidaysView />
    </RoleGuard>
  );
}
