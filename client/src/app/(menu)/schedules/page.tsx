import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import SchedulesView from '@/views/schedules';

export default function SchedulesPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN, UserRole.DOCTOR]}>
      <SchedulesView />
    </RoleGuard>
  );
}
