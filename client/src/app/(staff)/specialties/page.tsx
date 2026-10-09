import { RoleGuard } from '@/components/shared/RoleGuard';
import SpecialtiesView from '@/views/specialties';

export default function SpecialtiesPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'SPECIALTIES' }]}>
      <SpecialtiesView />
    </RoleGuard>
  );
}
