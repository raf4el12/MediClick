import { RoleGuard } from '@/components/shared/RoleGuard';
import DoctorsView from '@/views/doctors';

export default function DoctorsPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'DOCTORS' }]}>
      <DoctorsView />
    </RoleGuard>
  );
}
