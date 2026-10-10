import { RoleGuard } from '@/components/shared/RoleGuard';
import DoctorAgendaView from '@/views/doctor/agenda';

export default function DoctorAgendaPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'AGENDA' }]}>
      <DoctorAgendaView />
    </RoleGuard>
  );
}
