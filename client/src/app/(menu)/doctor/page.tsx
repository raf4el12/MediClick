import { RoleGuard } from '@/components/shared/RoleGuard';
import DoctorDashboardView from '@/views/doctor';

export default function DoctorPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'APPOINTMENTS' }]}>
      <DoctorDashboardView />
    </RoleGuard>
  );
}
