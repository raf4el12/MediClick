import { RoleGuard } from '@/components/shared/RoleGuard';
import WaitlistView from '@/views/waitlist';

export default function PatientWaitlistPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'APPOINTMENTS' }]}>
      <WaitlistView />
    </RoleGuard>
  );
}
