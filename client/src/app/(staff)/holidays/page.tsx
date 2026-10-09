import { RoleGuard } from '@/components/shared/RoleGuard';
import HolidaysView from '@/views/holidays';

export default function HolidaysPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'HOLIDAYS' }]}>
      <HolidaysView />
    </RoleGuard>
  );
}
