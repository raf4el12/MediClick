import { RoleGuard } from '@/components/shared/RoleGuard';
import JornadaView from '@/views/doctor/jornada';

export default function DoctorPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'AGENDA' }]}>
      <JornadaView />
    </RoleGuard>
  );
}
