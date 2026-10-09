import { RoleGuard } from '@/components/shared/RoleGuard';
import DoctorAppointmentsView from '@/views/doctor/appointments';

export default function DoctorAppointmentsPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'APPOINTMENTS' }]}>
      <DoctorAppointmentsView />
    </RoleGuard>
  );
}
