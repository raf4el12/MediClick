import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import DoctorAppointmentsView from '@/views/doctor/appointments';

export default function DoctorAppointmentsPage() {
  return (
    <RoleGuard roles={[UserRole.DOCTOR]}>
      <DoctorAppointmentsView />
    </RoleGuard>
  );
}
