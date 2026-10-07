import { RoleGuard } from '@/components/shared/RoleGuard';
import PatientAppointmentsView from '@/views/patient/appointments';

export default function PatientAppointmentsPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'APPOINTMENTS' }]}>
      <PatientAppointmentsView />
    </RoleGuard>
  );
}
