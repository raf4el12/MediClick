import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import ClinicalNotesView from '@/views/clinical-notes';

export default function ClinicalNotesPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN, UserRole.DOCTOR]}>
      <ClinicalNotesView />
    </RoleGuard>
  );
}
