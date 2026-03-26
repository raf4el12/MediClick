import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import PatientAppointmentsView from '@/views/patient/appointments';

export default function PatientAppointmentsPage() {
  return (
    <RoleGuard roles={[UserRole.PATIENT]}>
      <PatientAppointmentsView />
    </RoleGuard>
  );
}
