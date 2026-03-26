import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import SpecialtiesView from '@/views/specialties';

export default function SpecialtiesPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN]}>
      <SpecialtiesView />
    </RoleGuard>
  );
}
