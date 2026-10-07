import { RoleGuard } from '@/components/shared/RoleGuard';
import ScheduleBlocksView from '@/views/schedule-blocks';

export default function ScheduleBlocksPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'SCHEDULE_BLOCKS' }]}>
      <ScheduleBlocksView />
    </RoleGuard>
  );
}
