import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import MedicalHistoryView from '@/views/medical-history';

export default function MedicalHistoryPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN, UserRole.DOCTOR]}>
      <MedicalHistoryView />
    </RoleGuard>
  );
}
