import { RoleGuard } from '@/components/shared/RoleGuard';
import AppointmentsView from '@/views/appointments';

export default function AppointmentsPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'APPOINTMENTS' }]}>
      <AppointmentsView />
    </RoleGuard>
  );
}
