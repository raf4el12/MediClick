import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import ClinicsView from '@/views/clinics';

export default function ClinicsPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN]}>
      <ClinicsView />
    </RoleGuard>
  );
}
