import { RoleGuard } from '@/components/shared/RoleGuard';
import SchedulesView from '@/views/schedules';

export default function SchedulesPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'SCHEDULES' }]}>
      <SchedulesView />
    </RoleGuard>
  );
}
