import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import AppointmentsView from '@/views/appointments';

export default function AppointmentsPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST]}>
      <AppointmentsView />
    </RoleGuard>
  );
}
