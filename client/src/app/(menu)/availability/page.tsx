import { RoleGuard } from '@/components/shared/RoleGuard';
import AvailabilityView from '@/views/availability';

export default function AvailabilityPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'AVAILABILITY' }]}>
      <AvailabilityView />
    </RoleGuard>
  );
}
