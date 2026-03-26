import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import ScheduleBlocksView from '@/views/schedule-blocks';

export default function ScheduleBlocksPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN, UserRole.RECEPTIONIST]}>
      <ScheduleBlocksView />
    </RoleGuard>
  );
}
