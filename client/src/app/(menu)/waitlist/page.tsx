import { RoleGuard } from '@/components/shared/RoleGuard';
import ClinicWaitlistView from '@/views/waitlist/staff';

export default function ClinicWaitlistPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'APPOINTMENTS' }]}>
      <ClinicWaitlistView />
    </RoleGuard>
  );
}
